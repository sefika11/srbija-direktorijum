insert into data_sources (code, name, base_url, license, notes) values
  ('informator_poverenik', 'Informator o radu – jedinstveni informacioni sistem Poverenika', 'https://informator.poverenik.rs/', 'javni dokument organa javne vlasti',
   'Osnovni podaci organa: adresa, e-pošta, sajt, radno vreme, MB. Bez opšteg telefona; kontakti imenovanih lica se ne preuzimaju')
on conflict (code) do nothing;
