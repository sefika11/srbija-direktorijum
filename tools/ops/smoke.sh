#!/bin/sh
# Smoke test of a running site: the pages a visitor depends on answer, say what they should, and closed things stay closed.
#   sh tools/ops/smoke.sh                      # the live site
#   sh tools/ops/smoke.sh http://localhost:3101
# Exit code 1 when any line fails. Submits no form.
B="${1:-https://srbija-direktorijum.vercel.app}"; FAIL=0
check() {  # check <path> <expected status> [text the page must contain]
  body=$(curl -s -m 40 -w '\n%{http_code}' "$B$1"); code=$(printf '%s' "$body" | tail -1)
  if [ "$code" != "$2" ]; then echo "FAIL $1: status $code, expected $2"; FAIL=1; return; fi
  if [ -n "$3" ] && ! printf '%s' "$body" | grep -q "$3"; then echo "FAIL $1: does not contain '$3'"; FAIL=1; return; fi
  echo "ok   $1"
}
check / 200 "Gde da idem"
check /beograd 200 "Beograd"
check /apoteka 200 "Apotekarske"
check "/apoteka?mesto=nis" 200 "Niš"
check /maticna-sluzba 200 "Matične službe"
check /maticna-sluzba/maticna-sluzba-sabac 200 "Gospodar Jevremova"
check /rgz-katastar/republicki-geodetski-zavod-beograd/skn-aleksinac 200 "0700 500500"
check /sudski-vestak/sudski-vestak-acim-adzic-kula 200 "Iz zvaničnog registra"
check "/pretraga?q=advokat+zemun" 200 "u Zemunu"
check "/pretraga?q=posta+nis" 200 "Pošt"
check /vodic/licna-karta 200 ""
check /en 200 "institution"
check /privatnost 200 "Povereniku"
check /sitemap.xml 200 "sitemapindex"
check /robots.txt 200 "/urednik"
check /api/health 200 '"ok":true'
check /projektni-biro 404 ""
check /ovo-ne-postoji 404 ""
# an organisation page with nothing but a name and a town is kept out of search engines
check /mesna-zajednica/mesna-zajednica-veliko-polje-veliko-polje 200 "noindex"
[ "$FAIL" = "0" ] && echo "all good" || { echo "smoke test failed"; exit 1; }
