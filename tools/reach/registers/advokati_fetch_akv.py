import re,urllib.request,urllib.parse,http.cookiejar,json
UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'
h=open('akv.html',encoding='utf-8',errors='ignore').read()
nonce=re.search(r'id="wdtNonceFrontendServerSide_1" name="wdtNonceFrontendServerSide_1" value="(\w+)"',h).group(1)
cols=['ime','telefon','pbroj','mesto','adresa','email','komentar']
d={'draw':1,'start':0,'length':100,'wdtNonce':nonce,'order[0][column]':0,'order[0][dir]':'asc','search[value]':'','search[regex]':'false'}
for i,c in enumerate(cols):
    d[f'columns[{i}][data]']=i;d[f'columns[{i}][name]']=c;d[f'columns[{i}][searchable]']='true';d[f'columns[{i}][orderable]']='true';d[f'columns[{i}][search][value]']='';d[f'columns[{i}][search][regex]']='false'

import os,time
for st in range(0,3081,100):
    f=f'cache_akv/s{st}.json'
    if os.path.exists(f): continue
    d['start']=st;d['draw']=st//100+1
    time.sleep(1.1)
    r=urllib.request.Request('https://akv.org.rs/wp-admin/admin-ajax.php?action=get_wdtable&table_id=1',data=urllib.parse.urlencode(d).encode(),headers={'User-Agent':UA,'Referer':'https://akv.org.rs/akv-imenik/','X-Requested-With':'XMLHttpRequest'})
    open(f,'w').write(urllib.request.urlopen(r,timeout=60).read().decode())
print('done')
