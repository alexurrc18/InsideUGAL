import os
import asyncio
from dotenv import load_dotenv
from huggingface_hub import AsyncInferenceClient

load_dotenv(override=True)
hf_api_key = os.getenv("HUGGINGFACE_API_KEY")

async def test_models():
    client = AsyncInferenceClient(token=hf_api_key)
    models = [
        "black-forest-labs/FLUX.1-schnell",
        "black-forest-labs/FLUX.1-dev",
        "playgroundai/playground-v2.5-1024px-aesthetic",
        "stabilityai/stable-diffusion-3.5-large"
    ]
    
    for m in models:
        print(f"Testing {m}...")
        try:
            image = await client.text_to_image("A single red apple on a desk, clean minimal 3d vector", model=m, width=512, height=512)
            print(f"SUCCESS for {m}")
        except Exception as e:
            print(f"FAILED for {m}: {e}")

asyncio.run(test_models())
