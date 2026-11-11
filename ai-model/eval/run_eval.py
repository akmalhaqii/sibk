"""KPI-01/06: bandingkan keluaran parser (Node) dengan kunci jawaban Excel BEI.

Alur:
  1. cd backend && npm run export:parser
       -> data/processed/parser_output/<TICKER>_<PERIODE>_<company|bei>.json
  2. python eval/bei_excel.py
       -> data/ground_truth/bei_excel/<TICKER>_<PERIODE>.json
  3. python eval/run_eval.py
       -> pasangkan berkas berdasarkan <TICKER>_<PERIODE>, bandingkan per field
       -> ai-model/reports/parser_eval.csv  (ticker, periode, source, field, parsed, expected, diff, match)

Perbedaan klasifikasi antar sumber (mis. dana syirkah di dalam/luar liabilitas, RK-09)
dinormalisasi di sini sebelum dibandingkan.
"""


def main():
    raise NotImplementedError


if __name__ == "__main__":
    main()
