# Life-situation roadmaps: the roadmap (or the guide that answers the same words) must be within the first rows.
R=lambda s:f"/putokaz/{s}"
G=lambda s:f"/vodic/{s}"
C=[
("sr","rodila se beba",[R("rodilo-se-dete"),G("izvod-iz-maticne-knjige")],2),
("sr","kupujem stan",[R("kupujem-stan")],2),
("sr","uzimam kredit",[R("uzimam-kredit"),"/banka"],2),
("sr","razvod",[R("razvod-i-starateljstvo"),"/osnovni-sud"],2),
("sr","smrt u porodici",[R("smrt-u-porodici")],2),
("sr","odlazim u penziju",[R("odlazim-u-penziju"),"/pio-fond"],2),
("sr","selim se u drugi grad",[R("selim-se-u-drugi-grad"),G("prijava-prebivalista")],2),
("sr","kupujem auto",[R("kupujem-auto"),G("registracija-vozila")],2),
("sr","ukraden novčanik",[R("izgubljen-ili-ukraden-novcanik"),G("licna-karta"),"/mup-policijska-uprava"],2),
("sr","nasledstvo",[R("nasledjivanje"),"/javni-beleznik","/osnovni-sud"],2),
("sr","studentski posao",[R("prvi-ili-studentski-posao")],2),
("sr","privatno ili državno zdravstvo",[R("privatno-zdravstvo"),R("drzavno-zdravstvo-korak-po-korak")],3),
("en","buying an apartment",[R("kupujem-stan")],2),
("en","i lost my job",[R("ostao-sam-bez-posla"),G("prijava-na-nsz")],2),
("en","getting married",[R("stupam-u-brak")],2),
("ru","купить квартиру",[R("kupujem-stan")],2),
("ru","потерял работу",[R("ostao-sam-bez-posla"),G("prijava-na-nsz")],2),
("de","wohnung kaufen",[R("kupujem-stan")],2),
("de","kredit aufnehmen",[R("uzimam-kredit"),"/banka"],2),
]
