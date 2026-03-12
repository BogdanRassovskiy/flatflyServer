import sqlite3
import unicodedata


def norm(value: str) -> str:
    return unicodedata.normalize("NFKD", (value or "")).encode("ascii", "ignore").decode("ascii").lower().strip()


conn = sqlite3.connect("db.sqlite3")
cur = conn.cursor()

cur.execute("SELECT DISTINCT normalized_name FROM listings_czechmunicipality WHERE normalized_name != ''")
municipality_norm = {row[0] for row in cur.fetchall()}

cur.execute("SELECT id, city, title FROM listings_listing ORDER BY id")
rows = cur.fetchall()

updates = []
for listing_id, city, title in rows:
    city_text = (city or "").strip()
    title_text = (title or "").strip()
    if not city_text or not title_text:
        continue

    parts = [p.strip() for p in title_text.split(",")]
    if len(parts) < 2:
        continue

    tail = parts[-1]
    tail_norm = norm(tail)
    city_norm = norm(city_text)

    if tail_norm in municipality_norm and tail_norm != city_norm:
        parts[-1] = city_text
        new_title = ", ".join(parts)
        if new_title != title_text:
            updates.append((new_title, listing_id, title_text, city_text))

for new_title, listing_id, old_title, city_text in updates:
    cur.execute("UPDATE listings_listing SET title=? WHERE id=?", (new_title, listing_id))
    print(f"{listing_id}: '{old_title}' -> '{new_title}'")

conn.commit()
print(f"UPDATED_COUNT={len(updates)}")
conn.close()
