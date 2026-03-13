import json
import time
import urllib.parse
import urllib.request
from decimal import Decimal

from users.models import University

API = "https://nominatim.openstreetmap.org/search"
updated = 0
not_found = []

for u in University.objects.order_by("id"):
    q = f"{u.name}, Czech Republic"
    params = {
        "q": q,
        "format": "jsonv2",
        "limit": 1,
        "addressdetails": 1,
        "countrycodes": "cz",
    }
    url = API + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": "flatflyServer/1.0 (edu import)"})
    try:
        with urllib.request.urlopen(req, timeout=40) as resp:
            data = json.load(resp)
    except Exception:
        data = []

    if not data:
        not_found.append(u.name)
        time.sleep(1.1)
        continue

    item = data[0]
    lat = item.get("lat")
    lon = item.get("lon")
    addr = item.get("address") or {}
    display_name = item.get("display_name", "")
    city = addr.get("city") or addr.get("town") or addr.get("village") or addr.get("municipality") or ""

    changed = False
    if lat and lon:
        u.latitude = Decimal(str(lat))
        u.longitude = Decimal(str(lon))
        changed = True
    if display_name:
        u.address = display_name[:255]
        changed = True
    if city:
        u.city = city[:128]
        changed = True

    if changed:
        u.source = "MANUAL+NOMINATIM"
        u.save(update_fields=["latitude", "longitude", "address", "city", "source", "updated_at"])
        updated += 1

    time.sleep(1.1)

print("universities_total=", University.objects.count())
print("universities_updated_with_geo=", updated)
print("universities_not_found=", len(not_found))
print("not_found_sample=", not_found[:10])
