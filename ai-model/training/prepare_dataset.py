"""Muat Excel BEI massal (Q1 2025) -> CSV angka mentah (DT-10) dan log baris yang dikeluarkan.

Aturan (Bagian 6.3 Brief Tahap 2):
- Buka dengan openpyxl (read_only=True, data_only=True), sembunyikan UserWarning.
- Dari sheet 1000000: ambil ticker, name, sector, subsector, main_industry, currency, rounding, period_end.
- Keluarkan & catat alasan ke excluded_rows.csv bila:
  1. tidak ada sheet 1210000 atau industri utama bukan "Umum / General";
  2. sektor diawali "G." (Financials);
  3. mata uang bukan IDR;
  4. ticker ada di exclude_tickers (SMGR);
  5. salah satu dari 10 field inti kosong;
  6. total_assets <= 0 atau equity_parent <= 0 (termasuk prior);
  7. |total_assets - (total_liabilities + total_equity)| > 1% * total_assets.
- Kalikan nilai dengan faktor pembulatan (Jutaan 1e6, Ribuan 1e3, Miliaran 1e9, Satuan Penuh 1) -> rupiah penuh.
- Tulis ke data/processed/raw_bei.csv dan data/processed/excluded_rows.csv.
"""
from concurrent.futures import ProcessPoolExecutor
import csv
import os
import warnings
from collections import Counter
from pathlib import Path

import openpyxl

warnings.filterwarnings("ignore", category=UserWarning)

ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT.parent / "data" / "raw" / "Financial_Statement_2025_Q2"
OUT_CSV = ROOT.parent / "data" / "processed" / "raw_bei.csv"
EXCL_CSV = ROOT.parent / "data" / "processed" / "excluded_rows.csv"
REPORT_MD = ROOT / "reports" / "dataset_summary.md"

EXCLUDE_TICKERS = {"SMGR"}

BS_LABELS = {
    "jumlah aset": "total_assets",
    "jumlah aset lancar": "current_assets",
    "jumlah liabilitas": "total_liabilities",
    "jumlah liabilitas jangka pendek": "current_liabilities",
    "jumlah ekuitas": "total_equity",
    "jumlah ekuitas yang diatribusikan kepada pemilik entitas induk": "equity_parent",
}

IS_LABELS = {
    "penjualan dan pendapatan usaha": "revenue",
    "jumlah laba (rugi)": "net_income",
    "laba (rugi) yang dapat diatribusikan ke entitas induk": "net_income_parent",
}

CF_LABELS = {
    "jumlah arus kas bersih yang diperoleh dari (digunakan untuk) aktivitas operasi": "operating_cash_flow",
}

REQUIRED_FIELDS = [
    "total_assets",
    "current_assets",
    "total_liabilities",
    "current_liabilities",
    "total_equity",
    "equity_parent",
    "revenue",
    "net_income",
    "net_income_parent",
    "operating_cash_flow",
]

CSV_COLUMNS = [
    "ticker", "name", "sector", "subsector", "period_end", "currency", "rounding",
    "total_assets", "total_assets_prior",
    "current_assets", "current_assets_prior",
    "total_liabilities", "total_liabilities_prior",
    "current_liabilities", "current_liabilities_prior",
    "total_equity", "total_equity_prior",
    "equity_parent", "equity_parent_prior",
    "revenue", "revenue_prior",
    "net_income", "net_income_prior",
    "net_income_parent", "net_income_parent_prior",
    "operating_cash_flow", "operating_cash_flow_prior",
    "source_file",
]


def to_float(v):
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return float(v)
    s = str(v).strip()
    if not s or s in ("-", "—"):
        return None
    try:
        return float(s)
    except ValueError:
        return None


def rounding_factor(rounding_str: str) -> float:
    s = (rounding_str or "").lower()
    if "miliar" in s or "billion" in s:
        return 1e9
    if "juta" in s or "million" in s:
        return 1e6
    if "ribu" in s or "thousand" in s:
        return 1e3
    return 1.0


def parse_info_sheet(ws):
    info = {}
    for row in ws.iter_rows(values_only=True):
        if not row or row[0] is None:
            continue
        k = str(row[0]).strip().lower()
        val = str(row[1]).strip() if len(row) > 1 and row[1] is not None else ""
        if k == "nama entitas":
            info["name"] = val
        elif k == "kode entitas":
            info["ticker"] = val.upper()
        elif k == "industri utama entitas":
            info["main_industry"] = val
        elif k == "sektor":
            info["sector"] = val
        elif k == "subsektor":
            info["subsector"] = val
        elif k == "tanggal akhir periode berjalan":
            info["period_end"] = val[:10]
        elif k == "mata uang pelaporan":
            info["currency"] = val
        elif k.startswith("pembulatan yang digunakan"):
            info["rounding"] = val
    return info


def extract_sheet_fields(ws, label_map):
    out = {}
    for row in ws.iter_rows(values_only=True):
        if not row or row[0] is None:
            continue
        lbl = str(row[0]).strip().lower()
        if lbl in label_map:
            field = label_map[lbl]
            cur = to_float(row[1]) if len(row) > 1 else None
            pri = to_float(row[2]) if len(row) > 2 else None
            out[field] = (cur, pri)
    return out


def process_workbook(path: Path):
    warnings.filterwarnings("ignore", category=UserWarning)
    fallback_ticker = path.stem.split("_")[0].upper()
    try:
        wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    except Exception as e:
        return None, (fallback_ticker, path.name, f"corrupt_workbook:{type(e).__name__}")

    try:
        sheets = set(wb.sheetnames)
        if "1000000" not in sheets:
            return None, (fallback_ticker, path.name, "missing_1000000")

        info = parse_info_sheet(wb["1000000"])
        ticker = info.get("ticker") or fallback_ticker
        sector = info.get("sector", "")
        main_ind = info.get("main_industry", "")
        currency = info.get("currency", "")
        rounding = info.get("rounding", "")

        if ticker in EXCLUDE_TICKERS:
            return None, (ticker, path.name, "excluded_demo_ticker")

        if sector.upper().startswith("G."):
            return None, (ticker, path.name, "financial_sector_G")

        if "1210000" not in sheets or "umum" not in main_ind.lower():
            return None, (ticker, path.name, "non_general_industry_or_missing_1210000")

        if "idr" not in currency.lower() and "rupiah" not in currency.lower():
            return None, (ticker, path.name, f"non_idr_currency:{currency}")

        is_sheet = next((s for s in wb.sheetnames if s.startswith("13") and not s.endswith("PY")), None)
        cf_sheet = next((s for s in wb.sheetnames if s.startswith("15") and not s.endswith("PY")), None)
        if not is_sheet or not cf_sheet:
            return None, (ticker, path.name, "missing_is_or_cf_sheet")

        fields = {}
        fields.update(extract_sheet_fields(wb["1210000"], BS_LABELS))
        fields.update(extract_sheet_fields(wb[is_sheet], IS_LABELS))
        fields.update(extract_sheet_fields(wb[cf_sheet], CF_LABELS))

        for req in REQUIRED_FIELDS:
            if req not in fields or fields[req][0] is None or fields[req][1] is None:
                return None, (ticker, path.name, f"missing_field:{req}")

        ta, ta_p = fields["total_assets"]
        tl, tl_p = fields["total_liabilities"]
        te, te_p = fields["total_equity"]
        ep, ep_p = fields["equity_parent"]

        if ta <= 0 or ta_p <= 0 or ep <= 0 or ep_p <= 0:
            return None, (ticker, path.name, "non_positive_assets_or_equity")

        if abs(ta - (tl + te)) > 0.01 * ta:
            return None, (ticker, path.name, "balance_identity_mismatch")

        mul = rounding_factor(rounding)
        row_out = {
            "ticker": ticker,
            "name": info.get("name", ""),
            "sector": sector,
            "subsector": info.get("subsector", ""),
            "period_end": info.get("period_end", "2025-03-31"),
            "currency": "IDR",
            "rounding": rounding,
            "source_file": path.name,
        }
        for f in REQUIRED_FIELDS:
            c_val, p_val = fields[f]
            row_out[f] = round(c_val * mul)
            row_out[f"{f}_prior"] = round(p_val * mul)

        return row_out, None
    finally:
        wb.close()


def main():
    files = sorted(RAW_DIR.glob("*/2025/Q1/*_FS.xlsx"))
    print(f"[prepare_dataset] menemukan {len(files)} berkas Excel di {RAW_DIR}", flush=True)

    kept = []
    excluded = []
    seen_tickers = set()

    workers = min(8, os.cpu_count() or 4)
    with ProcessPoolExecutor(max_workers=workers) as ex:
        for idx, (row, excl) in enumerate(ex.map(process_workbook, files, chunksize=16), 1):
            if excl:
                excluded.append(excl)
            elif row:
                if row["ticker"] in seen_tickers:
                    excluded.append((row["ticker"], row["source_file"], "duplicate_ticker"))
                else:
                    seen_tickers.add(row["ticker"])
                    kept.append(row)
            if idx % 200 == 0 or idx == len(files):
                print(f"  diproses {idx}/{len(files)} (kept={len(kept)}, excluded={len(excluded)})", flush=True)

    OUT_CSV.parent.mkdir(parents=True, exist_ok=True)
    with OUT_CSV.open("w", newline="", encoding="utf-8") as fp:
        w = csv.DictWriter(fp, fieldnames=CSV_COLUMNS)
        w.writeheader()
        w.writerows(kept)

    with EXCL_CSV.open("w", newline="", encoding="utf-8") as fp:
        w = csv.writer(fp)
        w.writerow(["ticker", "source_file", "reason"])
        w.writerows(excluded)

    reason_counts = Counter(r[2].split(":")[0] for r in excluded)
    sector_counts = Counter(r["sector"] for r in kept)

    print(f"\n=== RINGKASAN DATASET Q1 2025 ===", flush=True)
    print(f"Total berkas dibaca : {len(files)}", flush=True)
    print(f"Emiten dipakai      : {len(kept)}", flush=True)
    print(f"Emiten dikeluarkan  : {len(excluded)}", flush=True)
    print("\nAlasan dikeluarkan:", flush=True)
    for k, c in reason_counts.most_common():
        print(f"  - {k}: {c}", flush=True)
    print("\nSebaran sektor (dipakai):", flush=True)
    for k, c in sorted(sector_counts.items()):
        print(f"  - {k}: {c}", flush=True)

    REPORT_MD.parent.mkdir(parents=True, exist_ok=True)
    lines = [
        "# Ringkasan Dataset Latih Klaster (BEI Q1 2025)\n",
        f"- **Periode laporan:** `2025-03-31` (`Q1`)",
        f"- **Total berkas Excel dibaca:** {len(files)}",
        f"- **Emiten lolos & dipakai (`raw_bei.csv`):** {len(kept)}",
        f"- **Emiten dikeluarkan (`excluded_rows.csv`):** {len(excluded)}\n",
        "## Alasan Baris Dikeluarkan\n",
        "| Alasan | Jumlah |",
        "| --- | ---: |",
        *[f"| `{k}` | {c} |" for k, c in reason_counts.most_common()],
        "\n## Sebaran Emiten per Sektor\n",
        "| Sektor | Jumlah |",
        "| --- | ---: |",
        *[f"| {k} | {c} |" for k, c in sorted(sector_counts.items())],
    ]
    REPORT_MD.write_text("\n".join(lines) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
