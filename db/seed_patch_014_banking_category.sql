insert into service_categories (slug, name_lat, name_cyr, icon, sort_order) values ('banke-i-novac', 'Banke i novac', 'Банке и новац', 'bank', 45) on conflict (slug) do nothing;
