import os
from dotenv import load_dotenv
from google import genai

current_dir = os.path.dirname(os.path.abspath(__file__))
root_env_path = os.path.abspath(os.path.join(current_dir, "..", ".env"))
load_dotenv(dotenv_path=root_env_path, override=True)

API_KEY = os.getenv("GEMINI_API_KEY")
if API_KEY:
    API_KEY = API_KEY.strip().strip("'").strip('"')
    client = genai.Client(api_key=API_KEY)
    print("Modele disponibile:")
    try:
        models = client.models.list()
        for m in models:
            print(f"- {m.name}")
    except Exception as e:
        print(f"Eroare la listare modele: {e}")
