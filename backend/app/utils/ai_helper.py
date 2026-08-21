import os

from openai import OpenAI

FALLBACK_DESCRIPTION = "Delicious, freshly prepared local favourite made with quality ingredients."

_client = None


def _get_client():
    """
    Lazily build the OpenAI client.

    Built on first use rather than at import time so the module can be imported (and
    the app started, and tests run) without an API key present.
    """
    global _client
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None
    if _client is None:
        _client = OpenAI(api_key=api_key)
    return _client


def generate_food_description(item_name):
    """
    Generate a short, appetising description for a menu item.

    Returns a sensible fallback rather than raising if the key is missing or the
    request fails - a vendor saving a menu item must never be blocked on this.
    """
    client = _get_client()
    if client is None:
        return FALLBACK_DESCRIPTION

    prompt = (
        f"Write a short, mouth-watering, one-sentence description for a menu item "
        f"called '{item_name}' sold by a local street food vendor in Kenya. "
        f"Keep it under 15 words."
    )

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a helpful assistant for food vendors."},
                {"role": "user", "content": prompt},
            ],
            max_tokens=40,
            temperature=0.7,
            timeout=10,
        )
        text = (response.choices[0].message.content or "").strip().replace('"', '')
        return text or FALLBACK_DESCRIPTION
    except Exception as e:
        print(f"OpenAI Error: {e}")
        return "Freshly prepared with local ingredients and spices."
