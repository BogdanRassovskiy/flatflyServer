import json
import re
import time
import unicodedata
import urllib.parse
import urllib.request
from decimal import Decimal

from users.models import University


def strip_accents(text: str) -> str:
    return unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")


def variants(name: str):
    raw = name.strip()
    v = [raw]
    no_paren = re.sub(r"\s*\(.*?\)", "", raw).strip()
    if no_paren and no_paren not in v:
        v.append(no_paren)
    ascii_name = strip_accents(no_paren)
    if ascii_name and ascii_name not in v:
        v.append(ascii_name)
    ascii_simple = ascii_name.replace(" - ", " ").replace(" – ", " ").strip()
    if ascii_simple and ascii_simple not in v:
        v.append(ascii_simple)
    return v


API = "https://nominatim.openstreetmap.org/search"
updated = 0
still_missing = []

for u in University.objects.filter(latitude__isnull=True).order_by("id"):
    found = None
    for qbase in variants(u.name):
        q = f"{qbase}, Czech Republic"
        params = {
            "q": q,
            "format": "jsonv2",
            "limit": 1,
            "addressdetails": 1,
            "countrycodes": "cz",
        }
        url = API + "?" + urllib.parse.urlencode(params)
        req = urllib.request.Request(url, headers={"User-Agent": "flatflyServer/1.0 (edu import fallback)"})
        try:
            with urllib.request.urlopen(req, timeout=40) as resp:
                data = json.load(resp)
        except Exception:
            data = []

        if data:
            found = data[0]
            break

        time.sleep(1.1)

    if not found:
        still_missing.append(u.name)
        time.sleep(1.1)
        continue

    lat = found.get("lat")
    lon = found.get("lon")
    addr = found.get("address") or {}
    display_name = found.get("display_name", "")
    city = addr.get("city") or addr.get("town") or addr.get("village") or addr.get("municipality") or ""

    if lat and lon:
        u.latitude = Decimal(str(lat))
        u.longitude = Decimal(str(lon))
    if display_name:
        u.address = display_name[:255]
    if city:
        u.city = city[:128]

    u.source = "MANUAL+NOMINATIM"
    u.save(update_fields=["latitude", "longitude", "address", "city", "source", "updated_at"])
    updated += 1
    time.sleep(1.1)

print("fallback_updated=", updated)
print("still_missing=", len(still_missing))
print("still_missing_sample=", still_missing[:20])
