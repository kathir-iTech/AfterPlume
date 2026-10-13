"""Reproduce the pinned public fixture. Python standard library only."""
from pathlib import Path
from collections import defaultdict
import csv, hashlib, io, json, shutil, sys, urllib.request, zipfile
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'apps/web/public/data'
EXPECTED = 'e0721015e925c4d70012ca13e697f5638421bc7c2a42f7e3dce8edec6cee8481'
URL = 'https://unepazeconomyadlsstorage.blob.core.windows.net/public/unep_methanedata_detected_plumes_csv.zip'
OUT.mkdir(parents=True, exist_ok=True)
target = OUT / 'mars-snapshot.zip'
if len(sys.argv)>1:
    shutil.copyfile(sys.argv[1], target)
elif not target.exists():
    with urllib.request.urlopen(URL, timeout=90) as response:
        target.write_bytes(response.read(20_000_001))
blob = target.read_bytes()
assert hashlib.sha256(blob).hexdigest() == EXPECTED, 'Download is not the pinned snapshot. Supply the original ZIP; do not silently replace its hash.'
with zipfile.ZipFile(io.BytesIO(blob)) as archive:
    def rows(leaf):
        name = next(n for n in archive.namelist() if n.split('/')[-1] == leaf)
        return list(csv.DictReader(io.StringIO(archive.read(name).decode('utf-8-sig'))))
    plumes = rows('unep_methanedata_detected_plumes.csv')
    sources = rows('unep_methanedata_detected_sources.csv')
assert len({r['id_plume'] for r in plumes}) == len(plumes)
def normalize(r):
    return dict(id=r['id_plume'], sourceId=r['source_name'], acquired=r['tile_date'], satellite=r['satellite'], rate=r['ch4_fluxrate'], std=r['ch4_fluxrate_std'], lat=r['lat'], lon=r['lon'], raw=r)
manifest = dict(id='unep-mars-2026-10-12', sha256=EXPECTED, url=URL, captured='2026-10-12', recordCount=len(plumes), sourceCount=len(sources), license='CC BY-NC-SA 4.0 (download); CC BY-NC 4.0 (terms)', coverage='Detection records only; per-overpass negative coverage unavailable')
# The small initial case is for fast browsing. Verification always scans the full ZIP.
case_ids = ['AZE_S_010']
fixture = dict(manifest=manifest, sources=[s for s in sources if s['source_name'] in case_ids], records=[normalize(r) for r in plumes if r['source_name'] in case_ids])
(OUT/'case.json').write_text(json.dumps(fixture,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
grouped = defaultdict(list)
for row in plumes:
    grouped[row['source_name']].append(row)
index = []
for source in sources:
    records = grouped[source['source_name']]
    dates = sorted(r['tile_date'][:10] for r in records if r['tile_date'])
    index.append(dict(id=source['source_name'], country=source['country'], sector=source['sector'],
                      lat=source['lat'], lon=source['lon'], count=len(records),
                      first=dates[0] if dates else '', latest=dates[-1] if dates else ''))
(OUT/'source-index.json').write_text(json.dumps(dict(manifest=manifest,sources=index,
    unassignedRecords=len(grouped.get('',[]))),ensure_ascii=False,separators=(',',':')),encoding='utf-8')
(ROOT/'public-data').mkdir(exist_ok=True)
(ROOT/'public-data/snapshot-manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
print(json.dumps({'zip_bytes':len(blob),'plumes':len(plumes),'sources':len(sources),'case_records':len(fixture['records']),'sha256':EXPECTED},indent=2))
