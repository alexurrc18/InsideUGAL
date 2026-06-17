import os
import pytest
from dotenv import load_dotenv
from huggingface_hub import AsyncInferenceClient

load_dotenv(override=True)
hf_api_key = os.getenv("HUGGINGFACE_API_KEY")

@pytest.mark.asyncio
async def test_llms():
    if not hf_api_key:
        pytest.skip("HUGGINGFACE_API_KEY lipseste")
        
    client = AsyncInferenceClient(token=hf_api_key)
    models = [
        "meta-llama/Llama-3.3-70B-Instruct",
        "meta-llama/Meta-Llama-3-8B-Instruct",
        "mistralai/Mistral-7B-Instruct-v0.3",
        "Qwen/Qwen2.5-7B-Instruct"
    ]
    
    for m in models:
        # Nu printăm în teste pentru a păstra output-ul curat
        res = await client.chat_completion(
            model=m,
            messages=[{"role": "user", "content": "Hello"}],
            max_tokens=10
        )
        assert res.choices[0].message.content
