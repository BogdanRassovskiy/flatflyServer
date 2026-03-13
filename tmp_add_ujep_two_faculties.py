import json
import urllib.parse
import urllib.request
from decimal import Decimal

from users.models import University, UniversityFaculty, normalize_text


def geocode(query: str):
    params = {
        "q": query,
        "format": "jsonv2",
        "limit": 1,
        "addressdetails": 1,
        "countrycodes": "cz",
    }
    url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": "flatflyServer/1.0 ujep-add"})
    with urllib.request.urlopen(req, timeout=40) as resp:
        data = json.load(resp)
    if not data:
        return None
    return data[0]


u = University.objects.filter(name__icontains="UJEP").first()
if not u:
    raise RuntimeError("UJEP not found")

targets = [
    "Fakulta zdravotnických studií UJEP",
    "Přírodovědecká fakulta UJEP",
]

added = 0
updated = 0
not_found = []

for target_name in targets:
    nrm = normalize_text(target_name)

    existing = UniversityFaculty.objects.filter(
        university=u,
        normalized_name__contains=normalize_text(target_name.split()[0]),
    ).first()
    if existing and (
        "zdravot" in normalize_text(existing.name) and "zdravot" in nrm
        or "prirod" in normalize_text(existing.name) and "prirod" in nrm
    ):
        continue

    query = f"{target_name}, Univerzita Jana Evangelisty Purkyně, Ústí nad Labem, Czech Republic"
    item = geocode(query)
    if not item:
        not_found.append(target_name)
        continue

    lat = Decimal(str(item.get("lat"))) if item.get("lat") else None
    lon = Decimal(str(item.get("lon"))) if item.get("lon") else None
    display = str(item.get("display_name") or "").strip()
    addr = item.get("address") or {}
    city = addr.get("city") or addr.get("town") or addr.get("village") or addr.get("municipality") or ""

    osm_id = item.get("osm_id")
    osm_type = item.get("osm_type")
    osm_ref = f"nominatim:{osm_type}/{osm_id}" if osm_id and osm_type else f"manual:{nrm}"

    defaults = {
        "university": u,
        "name": target_name,
        "normalized_name": nrm,
        "city": str(city)[:128],
        "address": display[:255],
        "latitude": lat,
        "longitude": lon,
        "source": "MANUAL+NOMINATIM",
    }

    by_key = UniversityFaculty.objects.filter(
        university=u,
        normalized_name=nrm,
    ).first()
    if by_key:
        changed = False
        for k, v in defaults.items():
            if getattr(by_key, k) != v:
                setattr(by_key, k, v)
                changed = True
        if not by_key.osm_ref:
            by_key.osm_ref = osm_ref
            changed = True
        if changed:
            by_key.save()
            updated += 1
        continue

    obj = UniversityFaculty.objects.filter(osm_ref=osm_ref).first()
    if obj:
        changed = False
        for k, v in defaults.items():
            if getattr(obj, k) != v:
                setattr(obj, k, v)
                changed = True
        if changed:
            obj.save()
            updated += 1
    else:
        UniversityFaculty.objects.create(osm_ref=osm_ref, **defaults)
        added += 1

qs = UniversityFaculty.objects.filter(university=u)
print("added=", added)
print("updated=", updated)
print("not_found=", not_found)
print("ujep_faculties_total=", qs.count())
for row in qs.values_list("name", "address"):
    print(row)
