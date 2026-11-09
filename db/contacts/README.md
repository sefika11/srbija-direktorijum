# Contact look-up results

Snapshots of contact data applied with `python -m importers.jobs.apply_contacts <file> --source <code>`:

- `pu_contacts_pdf_2026-11-10.json` — parsed from MUP's official PDF (lat-PU-PS-PI 28.01.2025) by `importers.sources.mup_pdf_contacts`; source `mup_portal`.
- `dz_contacts_2026-11-10.json` — websites, phones, emails, addresses and hours of 134 domovi zdravlja read from their own sites by a cheap-model agent; source `institution_site`. 89 sites / 84 with phones; unverified by hand, every row carries its `source_url`.

Re-apply to a fresh database after the base importers: both files are idempotent.
