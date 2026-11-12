import json, ddp
c = ddp.DDP()
q = {"published": True}; allr = []; seen=set(); pages=0; recon=0
while True:
    try:
        r = c.call("front_org.search", dict(q))
    except (EOFError, OSError) as e:
        recon+=1; print("reconnect", e, flush=True)
        if recon>6: break
        c = ddp.DDP(); continue
    pages+=1
    for x in r["result"]:
        if x["org_id"] not in seen: seen.add(x["org_id"]); allr.append(x)
    lm = r["load_more"]
    if not r["result"] or not lm.get("load_more"): break
    q["publishedAt"] = {"$lt": lm["timestamp"]}
    if pages%25==0: print(pages, len(allr), r["total_count"], flush=True)
json.dump(allr, open("bodies_list.json","w"), ensure_ascii=False)
print("pages",pages,"bodies",len(allr),"total_count_last",r["total_count"],"reconnects",recon)
