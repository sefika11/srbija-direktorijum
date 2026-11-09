-- Patch 016: give the generic public enterprises (`javno-preduzece`) a real type from their registered name.
-- Order matters: first match wins. Only rows still typed as the generic JP are touched, so re-running is safe.
begin;
with rules(slug, pattern) as (values
  ('jkp-vodovod',        '(vodovod|водовод|vodokanal|водоканал|kanalizacij|канализациј)'),
  ('jkp-toplana',        '(toplan|топлан|toplifik|топлифик|grejanj|грејањ|energetik|енергетик)'),
  ('jkp-gas',            '(\mgas\M|гас\M|distribucij\w* (prirodnog )?gasa|гаса\M|gasovod|гасовод)'),
  ('jkp-cistoca',        '(čistoć|cistoc|чистоћ|komunalac|комуналац|higijen|хигијен|otpad|отпад|deponij|депониј|reciklaž|рециклаж|komunalno|комунално|komunalne usluge|комуналне услуге)'),
  ('jkp-parking-servis', '(parking|паркинг)'),
  ('jkp-pijace',         '(pijac|пијац|tržnic|тржниц)'),
  ('jkp-pogrebne-usluge','(pogrebn|погребн|groblj|гробљ)'),
  ('jkp-zelenilo',       '(zelenil|зеленил|parkov|парков|gradsko zelenilo)'),
  ('jkp-gradski-prevoz', '(gradski (saobraćaj|saobracaj|prevoz)|градски (саобраћај|превоз)|autotransport|аутотранспорт|\mgsp\M|прево\w* путника|prevoz putnika)'),
  ('jp-putevi',          '(putev|путев|\mputeva\M|izgradnj|изградњ|građevinsk\w* zemljišt|грађевинск\w* земљишт|direkcij\w* za (izgradnju|urbanizam|urb)|дирекциј\w* за (изградњу|урбанизам))'),
  ('jp-urbanizam',       '(urbaniz|урбаниз|prostorn\w* planiranj|просторн\w* планирањ)'),
  ('jp-stambeno',        '(stambeno|стамбено|stanovanj|становањ|poslovni prostor|пословни простор)'),
  ('eps-distribucija',   '(elektrodistribucij|електродистрибуциј|\meps\M|elektroprivred|електропривред|distribucij\w* električne|дистрибуциј\w* електричне)')
), pick as (
  select o.id as org_id, (select r.slug from rules r where o.name_lat ~* r.pattern or coalesce(o.name_cyr,'') ~* r.pattern order by array_position(array['jkp-vodovod','jkp-toplana','jkp-gas','jkp-cistoca','jkp-parking-servis','jkp-pijace','jkp-pogrebne-usluge','jkp-zelenilo','jkp-gradski-prevoz','jp-putevi','jp-urbanizam','jp-stambeno','eps-distribucija'], r.slug) limit 1) as new_slug
  from organizations o join org_types t on t.id = o.org_type_id
  where t.slug = 'javno-preduzece'
)
update organizations o set org_type_id = nt.id, updated_at = now()
from pick p join org_types nt on nt.slug = p.new_slug
where o.id = p.org_id and p.new_slug is not null;
commit;
select t.slug, count(*) from organizations o join org_types t on t.id = o.org_type_id where t."group" = 'javna_preduzeca' group by 1 order by 2 desc;
