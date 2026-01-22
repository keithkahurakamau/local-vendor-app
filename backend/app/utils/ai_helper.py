import openai
import os

# Load API key from environment variables
openai.api_key = os.getenv("OPENAI_API_KEY")

def generate_food_description(item_name):
    """
    Generates a short, appetizing description for a menu item using OpenAI.
    """
    # Fallback if no key is configured
    if not openai.api_key:
        return "Delicious, freshly prepared local favorite made with quality ingredients."

    prompt = f"Write a short, mouth-watering, one-sentence description for a menu item called '{item_name}' sold by a local street food vendor in Kenya. Keep it under 15 words."

    try:
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful assistant for food vendors."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=30,
            temperature=0.7
        )
        return response.choices[0].message.content.strip().replace('"', '')
    except Exception as e:
        print(f"OpenAI Error: {e}")
        return "Freshly prepared with local ingredients and spices."