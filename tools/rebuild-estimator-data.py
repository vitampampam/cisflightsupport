#!/usr/bin/env python3
"""Rebuild the self-contained trip-estimator JS snapshot after changing assets/data/*.json."""
from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
f=root/'assets/trip.js';s=f.read_text(encoding='utf-8')
a='/* BEGIN AUTO-GENERATED ESTIMATOR DATA -- do not hand-edit this section */'
b='/* END AUTO-GENERATED ESTIMATOR DATA */'
keys={'airports':'airports.json','aircraft':'aircraft.json','routing':'routing.json','models':'aircraft-models.json','config':'estimator-config.json','emptyLegs':'empty-legs.json'}
data={k:json.loads((root/'assets/data'/p).read_text(encoding='utf-8')) for k,p in keys.items()}
if s.count(a)!=1 or s.count(b)!=1: raise SystemExit('Data markers not found exactly once')
start=s.index(a);finish=s.index(b)+len(b)
block=a+'\nvar CIS_ESTIMATOR_EMBEDDED = '+json.dumps(data,ensure_ascii=True,separators=(',',':'))+';\n'+b
f.write_text(s[:start]+block+s[finish:],encoding='utf-8')
print('Bundled',len(data['airports']),'airports and estimator configuration into',f)
