-- Patch 009: a lead vertical for partner / sponsor inquiries from the partners page (routed manually).
insert into lead_verticals (slug, name_lat, pitch_lat, default_price_rsd, routing_mode, form_schema) values
  ('partnerstvo', 'Partnerstvo i oglašavanje', 'Zakupite sponzorsko mesto ili primajte upite korisnika iz svog grada.', null, 'manual',
   '[{"name":"ime","label":"Ime i prezime","type":"text","required":true},{"name":"telefon","label":"Telefon","type":"tel","required":true},{"name":"firma","label":"Firma i grad","type":"text","required":true},{"name":"interes","label":"Šta vas zanima","type":"select","options":["Sponzorsko mesto na stranicama institucija","Upiti korisnika (lead forma)","Oglašavanje na vodičima","Nešto drugo"],"required":true}]')
on conflict (slug) do nothing;
