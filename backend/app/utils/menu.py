"""
Menu normalisation.

`VendorLocation.menu_items` is a schemaless JSON column, so rows written by older
versions of the app (and by an older test fixture) are still around in shapes the
current code does not expect:

    legacy dict : {"items": ["Samosa", "Pilau"], "prices": {"Samosa": 50}}
    legacy list : ["Samosa", "Pilau"]
    current     : [{"name": "Samosa", "desc": "...", "price": 50, "image": null}]

Search used to silently return nothing for the dict shape (it required a list), and
the map page crashed on it (`menu?.slice` throws when menu is a non-null object).
Everything now goes through normalise_menu_items() so a malformed row degrades to an
empty menu instead of breaking discovery or taking down a page.
"""


def _coerce_price(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def _item(name, price=0, desc='', image=None, item_id=None):
    name = str(name).strip()
    if not name:
        return None
    return {
        'id': item_id if item_id is not None else name.lower().replace(' ', '-'),
        'name': name,
        'desc': str(desc or ''),
        'price': _coerce_price(price),
        'image': image,
    }


def normalise_menu_items(raw):
    """Return a list of menu-item dicts for any historical shape. Never raises."""
    if not raw:
        return []

    items = []

    # Current shape: a list of dicts (or, older still, a list of bare strings)
    if isinstance(raw, list):
        for entry in raw:
            if isinstance(entry, dict):
                built = _item(
                    entry.get('name', ''),
                    entry.get('price', 0),
                    entry.get('desc') or entry.get('description') or '',
                    entry.get('image'),
                    entry.get('id'),
                )
            elif isinstance(entry, str):
                built = _item(entry)
            else:
                built = None
            if built:
                items.append(built)
        return items

    # Legacy shape: {"items": [...], "prices": {name: price}}
    if isinstance(raw, dict):
        prices = raw.get('prices') if isinstance(raw.get('prices'), dict) else {}
        names = raw.get('items')
        if isinstance(names, list):
            for name in names:
                if isinstance(name, str):
                    built = _item(name, prices.get(name, 0))
                    if built:
                        items.append(built)
        return items

    return []


def menu_matches(raw, query):
    """True if any item's name or description contains `query` (case-insensitive)."""
    query = (query or '').lower().strip()
    if not query:
        return False
    for item in normalise_menu_items(raw):
        if query in item['name'].lower() or query in item['desc'].lower():
            return True
    return False
