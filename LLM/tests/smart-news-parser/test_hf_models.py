import os
import pytest
from dotenv import load_dotenv
from huggingface_hub import AsyncInferenceClient

load_dotenv(override=True)
hf_api_key = os.getenv("HUGGINGFACE_API_KEY")

@pytest.mark.asyncio
async def test_models():
    if not hf_api_key:
        pytest.skip("HUGGINGFACE_API_KEY lipseste")

    client = AsyncInferenceClient(token=hf_api_key)
    models = [
        "black-forest-labs/FLUX.1-schnell",
        "black-forest-labs/FLUX.1-dev",
        "playgroundai/playground-v2.5-1024px-aesthetic",
        "stabilityai/stable-diffusion-3.5-large"
    ]
    
    for m in models:
        image = await client.text_to_image("A single red apple on a desk, clean minimal 3d vector", model=m, width=512, height=512)
        assert image
