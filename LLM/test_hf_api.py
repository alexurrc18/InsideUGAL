import os
import requests
from dotenv import load_dotenv

load_dotenv("D:\\InsideUGAL\\InsideUGAL\\.env")
hf_api_key = os.getenv("HUGGINGFACE_API_KEY")

API_URL = "https://api-inference.huggingface.co/models/runwayml/stable-diffusion-v1-5"
headers = {"Authorization": f"Bearer {hf_api_key}"}

with open("D:\\InsideUGAL\\InsideUGAL\\LLM\\src\\smart-news-parser\\assets\\buildings\\aciee\\corp_Y12.png", "rb") as f:
    img_bytes = f.read()

# Using standard text-to-image endpoint but trying to pass image
# HF Inference API for image-to-image actually accepts the image in binary as body, but prompt is passed how?
# Actually, it's better to just use text-to-image and maybe paste the building image over it using PIL?
