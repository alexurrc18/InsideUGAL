import os
from dotenv import load_dotenv
from huggingface_hub import InferenceClient

load_dotenv("D:\\InsideUGAL\\InsideUGAL\\.env")
hf_api_key = os.getenv("HUGGINGFACE_API_KEY")

def test_hf():
    client = InferenceClient(token=hf_api_key)
    with open("D:\\InsideUGAL\\InsideUGAL\\LLM\\src\\smart-news-parser\\assets\\buildings\\aciee\\corp_Y12.png", "rb") as f:
        img_bytes = f.read()

    models = [
        "timbrooks/instruct-pix2pix"
    ]
    
    for m in models:
        print(f"Testing model sync: {m}...")
        try:
            res = client.image_to_image(
                prompt="make it cyberpunk",
                image=img_bytes,
                model=m,
            )
            res.save(f"test_{m.replace('/', '_')}.png")
            print(f"Success {m}!")
            break
        except Exception as e:
            print(f"Error {m}: {e}")

test_hf()
