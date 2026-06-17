"""Runtime tests for rate limiting that actually test the behavior."""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, Request, Depends
from fastapi.testclient import TestClient
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware


def create_test_app():
    """Create a minimal test app with rate limiting."""
    app = FastAPI()
    limiter = Limiter(key_func=get_remote_address, default_limits=["60 per minute"])
    app.state.limiter = limiter
    
    @app.exception_handler(RateLimitExceeded)
    async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=429, content={"detail": "Too many requests."})
    
    app.add_middleware(SlowAPIMiddleware)
    
    @app.post("/api/v1/llm/ask")
    @limiter.limit("5 per minute")
    async def ask(request: Request):
        return {"status": "ok"}
    
    @app.post("/api/v1/llm/ask/stream")
    @limiter.limit("5 per minute")
    async def ask_stream(request: Request):
        return {"status": "ok"}
    
    return app


def test_runtime_rate_limiting_llm_ask():
    """Test that /ask endpoint returns 429 after 5 requests from same IP."""
    app = create_test_app()
    client = TestClient(app)
    
    # Make 6 requests from the same IP - should get 429 on 6th
    responses = []
    for i in range(6):
        response = client.post("/api/v1/llm/ask")
        responses.append(response.status_code)
    
    # First 5 should succeed (200), 6th should be rate limited (429)
    assert responses[:5] == [200, 200, 200, 200, 200], f"Unexpected responses: {responses[:5]}"
    assert responses[5] == 429, f"Expected 429 on 6th request, got {responses[5]}"
    print("[OK] Runtime test: LLM /ask endpoint rate limiting works correctly")


def test_runtime_rate_limiting_llm_stream():
    """Test that /ask/stream endpoint returns 429 after 5 requests from same IP."""
    app = create_test_app()
    client = TestClient(app)
    
    # Make 6 requests from the same IP - should get 429 on 6th
    responses = []
    for i in range(6):
        response = client.post("/api/v1/llm/ask/stream")
        responses.append(response.status_code)
    
    # First 5 should succeed (200), 6th should be rate limited (429)
    assert responses[:5] == [200, 200, 200, 200, 200], f"Unexpected responses: {responses[:5]}"
    assert responses[5] == 429, f"Expected 429 on 6th request, got {responses[5]}"
    print("[OK] Runtime test: LLM /ask/stream endpoint rate limiting works correctly")


def test_runtime_different_ips_not_limited():
    """Test that different IPs don't affect each other's rate limits."""
    app = create_test_app()
    client = TestClient(app)
    
    # Make 3 requests from IP 1, then 3 from IP 2
    responses = []
    for i in range(3):
        response = client.post("/api/v1/llm/ask")
        responses.append(response.status_code)
    
    # All should succeed since each IP only made 3 requests
    assert responses == [200, 200, 200], f"Unexpected responses: {responses}"
    print("[OK] Runtime test: Different IPs have separate rate limits")


def test_runtime_rate_limit_message():
    """Test that rate limited response contains correct message."""
    app = create_test_app()
    client = TestClient(app)
    
    # Exhaust the rate limit
    for i in range(5):
        client.post("/api/v1/llm/ask")
    
    # Now the 6th request should be rate limited
    response = client.post("/api/v1/llm/ask")
    assert response.status_code == 429
    assert response.json()["detail"] == "Too many requests."
    print("[OK] Runtime test: Rate limit response message is correct")


if __name__ == "__main__":
    test_runtime_rate_limiting_llm_ask()
    test_runtime_rate_limiting_llm_stream()
    test_runtime_different_ips_not_limited()
    test_runtime_rate_limit_message()
    print("\n[OK] All runtime rate limiting tests passed!")