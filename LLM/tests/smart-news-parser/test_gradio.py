import os
from dotenv import load_dotenv
from gradio_client import Client

load_dotenv(override=True)
token = os.getenv("HUGGINGFACE_API_KEY")
print(f"Token gasit: {bool(token)}")

for space in ["multimodalart/controlnet-sdxl", "xibanya/controlnet-canny", "huggingface-projects/ControlNet-SDXL", "radames/controlnet-sdxl"]:
    try:
        print(f"Incerc spatiul {space}...")
        client = Client(space, hf_token=token)
        endpoints = client.view_api(return_format="dict")
        print(f"  -> SUCCESS! Spatiul este activ si a returnat API-ul.")
    except Exception as e:
        print(f"  -> EROARE: {e}")
