import os,re,json,glob,html
D=os.path.dirname(os.path.abspath(__file__))
OUT='advokati_2026-11-12.json'
def tc(s):
    return ' '.join(w[:1].upper()+w[1:].lower() if w else w for w in s.split(' '))
def titlecase_name(s):
    s=' '.join(s.split())
    return re.sub(r"[^\s\-]+",lambda m:m.group(0)[:1].upper()+m.group(0)[1:].lower(),s)
def phones(s):
    out=[]
    for p in re.split(r'[,;/]\s+|\s{2,}',s or ''):
        p=p.strip()
        if re.search(r'\d{5}',p) and p not in out: out.append(p)
    return out
def cityfix(t): return titlecase_name(t) if t else None
rows=[];seen=set()
def add(r):
    k=(r['name'].lower(),(r['address'] or '').lower(),r['town'])
    if k in seen: return
    seen.add(k);rows.append(r)
# AKS
for f in sorted(glob.glob(D+'/cache_aks/*.html')):
    m=re.search(r'k(\d+)_p(\d+)',f);k,p=m.groups()
    h=open(f,encoding='utf-8').read()
    for tr in re.findall(r'<tr>\s*<td data-label="Ime i prezime"[\s\S]*?</tr>',h):
        td=re.findall(r'<td data-label="([^"]+)"[^>]*>([\s\S]*?)</td>',tr)
        d={a:b for a,b in td}
        strip=lambda x:html.unescape(re.sub(r'<[^>]+>','',x)).strip()
        name=' '.join(strip(d['Ime i prezime']).split())
        komora=strip(d['Komora']);addr=strip(d['Adresa'])
        ph=[strip(x) for x in re.findall(r'<a class="tel"[^>]*>([\s\S]*?)</a>',d['Telefon'])]
        em=[html.unescape(x) for x in re.findall(r'<a href="mailto:[^"]*">([^<]+)</a>',d['E-mail'])]
        street=None;town=None;muni=None
        parts=[x.strip() for x in addr.split(',')]
        mo=None
        if parts and parts[-1].lower().startswith('opština '): muni=parts.pop()[8:]
        if parts:
            m2=re.match(r'^(\d{5})\s+(.+)$',parts[-1])
            if m2: town=m2.group(2);parts.pop()
            street=', '.join(parts) or None
        add({"name":"Advokat "+titlecase_name(name),"type_slug":"advokat","town":town,"municipality":muni or town,"address":street,"phones":ph,"emails":em,"website":None,"hours":None,
             "extra":{"komora":komora},"source_url":f"https://imenik.aks.org.rs/index.php?ime=&prezime=&komora={k}&strana={p}"})
naks=len(rows)
# AKV
for f in sorted(glob.glob(D+'/cache_akv/*.json'),key=lambda x:int(re.search(r's(\d+)',x).group(1))):
    for r in json.load(open(f))['data']:
        name,tel,pb,mesto,adr,mail,kom=r
        em=re.findall(r'mailto:([^"]+)"',mail) or ([mail] if '@' in mail else [])
        s=int(re.search(r's(\d+)',f).group(1))
        x={"komora":"Advokatska komora Vojvodine"}
        if kom.strip(): x["komentar"]=kom.strip()
        add({"name":"Advokat "+titlecase_name(name),"type_slug":"advokat","town":cityfix(mesto),"municipality":cityfix(mesto),"address":(adr or '').strip() or None,"phones":phones(tel),"emails":em,"website":None,"hours":None,
             "extra":x,"source_url":"https://akv.org.rs/akv-imenik/"})
out={"source":{"name":"Imenik advokata - Advokatska komora Srbije (imenik.aks.org.rs) and Advokatska komora Vojvodine (akv.org.rs/akv-imenik)","url":"https://imenik.aks.org.rs/","fetched_at":"2026-11-12"},"rows":rows}
json.dump(out,open(OUT,'w'),ensure_ascii=False,indent=1)
from collections import Counter
print(len(rows),'aks',naks,Counter(r['extra']['komora'] for r in rows))
print('with email',sum(bool(r['emails']) for r in rows),'phone',sum(bool(r['phones']) for r in rows),'town',sum(bool(r['town']) for r in rows))
