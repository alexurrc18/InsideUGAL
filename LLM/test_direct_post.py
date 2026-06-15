import os
import requests
from dotenv import load_dotenv

load_dotenv("D:\\InsideUGAL\\InsideUGAL\\.env")
hf_api_key = os.getenv("HUGGINGFACE_API_KEY")

API_URL = "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0"
headers = {"Authorization": f"Bearer {hf_api_key}"}

with open("D:\\InsideUGAL\\InsideUGAL\\LLM\\src\\smart-news-parser\\assets\\buildings\\aciee\\corp_Y12.png", "rb") as f:
    img_bytes = f.read()

response = requests.post(
    API_URL,
    headers=headers,
    data=img_bytes,
    params={"strength": 0.7}
)

if response.status_code == 200:
    with open("direct_test.png", "wb") as f:
        f.write(response.content)
    print("Success!")
else:
    print(f"Error: {response.status_code} - {response.text}")
