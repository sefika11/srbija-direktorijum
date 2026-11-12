# Register fetches of 2026-11-12

Scripts written by the fetch agents, kept so the two registers can be pulled again. The data files themselves are not in
git (they hold lawyers' office contacts and estate agents' business contacts); they live in `.cache/registers_2026-11-12/`.

Run in a working folder outside git:

    mkdir -p .cache/registers_2026-11-12 && cp tools/reach/registers/*.py .cache/registers_2026-11-12/ && cd .cache/registers_2026-11-12

- **Lawyers** (bar directories; one request a second, robots.txt read and obeyed, no login or CAPTCHA):
  `python3 advokati_fetch_aks.py` (imenik.aks.org.rs, bars 1, 3, 4, 5, 6, 7, 8), then save https://akv.org.rs/akv-imenik/
  as `akv.html`, `mkdir cache_akv`, `python3 advokati_fetch_akv.py`, then `python3 advokati_build.py`.
- **Estate agents** (ministry register, one request): save the answer of
  `POST https://registar.must.gov.rs/MttApi/api/companies` with body `{}` as `all.json`, then `python3 nekretnine_build.py`.

Then, from the repo root: `python tools/reach/prepare_registers.py` and
`python -m tools.reach.load_in_batches <file>_clean.json --source aks_imenik|must_posrednici`, and `sh tools/reach/after_import.sh`.
