-- Sources of the 2026-11-12 quality pass.
insert into data_sources (code, name, base_url, license, notes) values
  ('must_posrednici', 'Ministarstvo unutrašnje i spoljne trgovine – Registar posrednika u prometu i zakupu nepokretnosti', 'https://registar.must.gov.rs/', 'javni registar', 'Ceo registar jednim zahtevom (dugme "Svi posrednici"); bez radnog vremena'),
  ('rgz_sluzbe', 'RGZ – spisak službi za katastar nepokretnosti', 'https://info-centar.rgz.gov.rs/', 'zvanični sajt', 'Samo nazivi službi; adrese, telefone i radno vreme po službama RGZ ne objavljuje'),
  ('aks_imenik', 'Advokatska komora Srbije i regionalne komore – imenik advokata', 'https://aks.org.rs/', 'javni imenik', 'Kancelarijski podaci aktivnih advokata')
on conflict (code) do nothing;
