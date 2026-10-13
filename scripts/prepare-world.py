"""Prepare a local, public-domain land outline; no external map service at runtime."""
import hashlib, json, urllib.request
from pathlib import Path
revision = 'ca96624a56bd078437bca8184e78163e5039ad19'
url = f'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/{revision}/geojson/ne_110m_land.geojson'
blob = urllib.request.urlopen(url, timeout=90).read(2_000_000)
land = json.loads(blob)
paths = []
for feature in land['features']:
    geom = feature['geometry']
    polygons = [geom['coordinates']] if geom['type']=='Polygon' else geom['coordinates']
    for rings in polygons:
        parts = []
        for ring in rings:
            points = [(round((lon+180)/360*900,2),round((85-lat)/170*460,2)) for lon,lat,*_ in ring]
            parts.append('M'+'L'.join(f'{x},{y}' for x,y in points)+'Z')
        paths.append(''.join(parts))
out = Path(__file__).resolve().parents[1]/'apps/web/public/data/world-land.json'
out.write_text(json.dumps(dict(paths=paths,source=url,sha256=hashlib.sha256(blob).hexdigest(),license='Public domain · Natural Earth'),separators=(',',':')),encoding='utf-8')
print(f'Prepared {len(paths)} public-domain land polygons.')
