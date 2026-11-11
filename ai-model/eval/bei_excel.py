"""Excel BEI -> kunci jawaban berformat sama dengan keluaran parser.

Sheet 1210000 (posisi keuangan), 1311000 (laba rugi), 1510000 (arus kas).
Nama field memakai nama kanonik yang sama dengan backend/config/labels.json;
pemetaan kode/label taksonomi BEI -> field kanonik ada di eval/bei_field_map.json.

in : data/raw/bei_excel/<TICKER>_<PERIODE>.xlsx
out: data/ground_truth/bei_excel/<TICKER>_<PERIODE>.json
     {"entity": {...}, "fields": {"total_assets": {"value": ..., "prior": ...}, ...}}

Catatan satuan: kunci jawaban disimpan dalam satuan yang sama dengan entity.unit
hasil parser (mis. "juta IDR") agar run_eval membandingkan apel dengan apel.
"""

SHEETS = {"balance_sheet": "1210000", "income_statement": "1311000", "cash_flow": "1510000"}


def load(path):
    raise NotImplementedError


def main():
    raise NotImplementedError


if __name__ == "__main__":
    main()
