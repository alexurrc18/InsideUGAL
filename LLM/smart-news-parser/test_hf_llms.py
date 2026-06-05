import os
import asyncio
from dotenv import load_dotenv
from huggingface_hub import AsyncInferenceClient

load_dotenv(override=True)
hf_api_key = os.getenv("HUGGINGFACE_API_KEY")

async def test_llms():
    client = AsyncInferenceClient(token=hf_api_key)
    models = [
        "meta-llama/Llama-3.3-70B-Instruct",
        "meta-llama/Meta-Llama-3-8B-Instruct",
        "mistralai/Mistral-7B-Instruct-v0.3",
        "Qwen/Qwen2.5-7B-Instruct"
    ]
    
    for m in models:
        print(f"Testing {m}...")
        try:
            res = await client.chat_completion(
                model=m,
                messages=[{"role": "user", "content": "Hello"}],
                max_tokens=10
            )
            print(f"SUCCESS for {m}")
        except Exception as e:
            print(f"FAILED for {m}: {e}")

asyncio.run(test_llms())
