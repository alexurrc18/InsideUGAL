import os
from dotenv import load_dotenv
from google import genai

# Obtinem calea absoluta catre fisierul .env din smart-news-parser
current_dir = os.path.dirname(os.path.abspath(__file__))
local_env_path = os.path.join(current_dir, ".env")

# Incarcam variabilele de mediu
load_dotenv(dotenv_path=local_env_path, override=True)

API_KEY = os.getenv("GEMINI_API_KEY")

print(f"--- Debug info ---")
print(f"Cale .env: {local_env_path}")
if API_KEY:
    masked_key = API_KEY[:4] + "*" * (len(API_KEY) - 8) + API_KEY[-4:] if len(API_KEY) > 8 else "****"
    print(f"API Key gasit: {masked_key}")
    print(f"Lungime cheie: {len(API_KEY.strip())}")
else:
    print("API Key NU a fost gasit in .env!")

if API_KEY:
    try:
        client = genai.Client(api_key=API_KEY.strip().strip("'").strip('"'))
        print("Se incearca un apel simplu la Gemini...")
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents="Salut, esti online?"
        )
        print("Succes! Raspuns Gemini:")
        print(response.text)
    except Exception as e:
        print(f"Eroare la apelul API: {e}")
