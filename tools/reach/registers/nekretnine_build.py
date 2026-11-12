import json,re,collections,datetime
d=json.load(open('all.json'))
CY=dict(zip("АБВГДЂЕЖЗИЈКЛЉМНЊОПРСТЋУФХЦЧЏШабвгдђежзијклљмнњопрстћуфхцчџш",
 ["A","B","V","G","D","Đ","E","Ž","Z","I","J","K","L","Lj","M","N","Nj","O","P","R","S","T","Ć","U","F","H","C","Č","Dž","Š","a","b","v","g","d","đ","e","ž","z","i","j","k","l","lj","m","n","nj","o","p","r","s","t","ć","u","f","h","c","č","dž","š"]))
def tr(s):
    out=''.join(CY.get(c,c) for c in s)
    return out
def clean(s): return re.sub(r'\s+',' ',s.replace('\r',' ').replace('\n',' ')).strip() if s else ''
def addr(s):
    s=tr(s or '').replace('\r','')
    parts=[clean(p) for p in s.split(',')]
    parts=[p for p in parts if p]
    if not parts: return None,None,None
    town=parts[-1]; street=', '.join(parts[:-1]) or None
    muni=None
    m=re.match(r'^(.*?)\s*[-–]\s*(.+)$',town) or re.match(r'^(.*?)\s*\((.+)\)$',town)
    if m: town,muni=m.group(1).strip(),m.group(2).strip()
    return street,town,muni or town
rows=[];exp=0
today=datetime.date(2026,11,12)
for r in d:
    st,town,muni=addr(r['hqAddress'])
    ph=[]
    for p in (r['phone'],r['phone2']):
        p=clean(p)
        if p and p not in ph: ph.append(p)
    em=[e.strip().lower() for e in re.split(r'[;, ]+',r['eMail'] or '') if '@' in e]
    w=clean(r['webPage'])
    if w in ('','/','-') : w=None
    elif not re.match(r'https?://',w,re.I): w='http://'+w
    ex={'broj_u_registru':r['registryNumber'],'maticni_broj':r['identificationNumber'],'datum_upisa':r['registryDate'],'pib':r['taxNumber'],'oblik':tr(r['companyTypeName'])}
    br=[clean(tr(x)) for x in (r['branchAddress'] or '').split('\n') if clean(x)]
    bs=[clean(tr(x)) for x in (r['businessSiteAddress'] or '').split('\n') if clean(x)]
    if br: ex['adresa_ogranka']=br
    if bs: ex['poslovni_prostor']=bs
    ex['polisa_do']=r['insuranceContractExpiryDate']
    try:
        dt=datetime.datetime.strptime(r['insuranceContractExpiryDate'].strip('.'),'%d.%m.%Y').date()
        if dt<today: exp+=1
    except Exception: pass
    rows.append({"name":clean(tr(r['name'])),"type_slug":"agencija-za-nekretnine","town":town,"municipality":muni,"address":st,"phones":ph,"emails":em,"website":w,"hours":None,"extra":ex,"source_url":"https://registar.must.gov.rs/#/registry-search"})
out={"source":{"name":"Registar posrednika u prometu i zakupu nepokretnosti (Ministarstvo unutrašnje i spoljne trgovine)","url":"https://registar.must.gov.rs/","fetched_at":"2026-11-12"},"rows":rows}
p='posrednici_nekretnine_2026-11-12.json'
json.dump(out,open(p,'w'),ensure_ascii=False,indent=1)
n=len(rows)
for k in ['town','municipality','address','phones','emails','website']: print(k,sum(1 for x in rows if x[k]))
print(n,'expired policy',exp)
print(collections.Counter(x['town'] for x in rows).most_common(12))
print([x['address'] for x in rows if not x['address']][:5], sum(1 for x in rows if x['municipality']!=x['town']))
print(sum(1 for x in rows if not re.search(r'\d|bb',x['address'] or '')))
print([ (x['name'],x['address'],x['town']) for x in rows[:3]])
print(collections.Counter(x['name'].lower() for x in rows).most_common(3))
