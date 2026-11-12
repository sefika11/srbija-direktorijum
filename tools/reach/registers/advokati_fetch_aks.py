import os,re,sys,time,html,urllib.request,urllib.parse
D=os.path.dirname(os.path.abspath(__file__));C=os.path.join(D,'cache_aks');os.makedirs(C,exist_ok=True)
UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'
def get(k,p):
    f=os.path.join(C,f'k{k}_p{p}.html')
    if os.path.exists(f): return open(f,encoding='utf-8').read()
    time.sleep(1.1)
    u=f'https://imenik.aks.org.rs/index.php?ime=&prezime=&komora={k}&strana={p}'
    h=urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':UA}),timeout=60).read().decode('utf-8')
    open(f,'w',encoding='utf-8').write(h);return h
def pages(h):
    m=re.search(r'strana \d+ od (\d+)',h);return int(m.group(1)) if m else 1
for k in [1,3,4,5,6,7,8]:
    h=get(k,1);n=pages(h)
    for p in range(2,n+1): get(k,p)
    print('komora',k,'pages',n,flush=True)
