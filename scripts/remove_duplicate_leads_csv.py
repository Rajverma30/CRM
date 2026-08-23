import csv
from pathlib import Path

csv_path = Path('leads_rows.csv')
if not csv_path.exists():
    raise SystemExit(f'File not found: {csv_path}')

with csv_path.open('r', encoding='utf-8-sig', newline='') as file:
    reader = csv.DictReader(file)
    rows = list(reader)
    fieldnames = reader.fieldnames or []

if not rows:
    print('No rows found. Nothing to do.')
    raise SystemExit(0)

seen = set()
kept = []
for row in rows:
    place = (row.get('place_id') or '').strip().lower()
    website = (row.get('website') or '').strip().lower()
    phone = (row.get('phone') or '').strip().lower()
    business = (row.get('business_name') or row.get('name') or '').strip().lower()

    if place:
        key = ('place', place)
    elif website:
        key = ('website', website)
    elif phone:
        key = ('phone', phone)
    elif business:
        key = ('business', business)
    else:
        key = ('row', len(kept))

    if key in seen:
        continue

    seen.add(key)
    kept.append(row)

with csv_path.open('w', encoding='utf-8-sig', newline='') as file:
    writer = csv.DictWriter(file, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(kept)

print(f'Original rows: {len(rows)}')
print(f'Unique rows kept: {len(kept)}')
print(f'Duplicates removed: {len(rows) - len(kept)}')
