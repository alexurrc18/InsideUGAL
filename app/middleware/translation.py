import json
import logging
import httpx
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request, Response
import os

logger = logging.getLogger(__name__)
LLM_SERVICE_URL = os.getenv("LLM_SERVICE_URL", "http://llm:8000")

class TranslationMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # 1. Get the requested language from header
        target_lang = request.headers.get("Accept-Language", "ro").split(",")[0].split("-")[0].lower()
        
        # 2. Call the next middleware/endpoint
        response = await call_next(request)
        
        # 3. Check if we need to translate (only JSON responses, and target is not 'ro')
        if target_lang == "ro" or target_lang == "*":
            return response
            
        content_type = response.headers.get("Content-Type", "")
        if "application/json" not in content_type:
            return response
            
        # Do not translate non-GET requests (or maybe we do? Let's stick to GET for safety of data mutations)
        if request.method != "GET":
            return response
            
        # 4. Extract response body
        # Since response.body is not directly accessible without consuming the stream,
        # we have to iterate over the body iterator.
        body = b""
        async for chunk in response.body_iterator:
            body += chunk
            
        try:
            data = json.loads(body.decode("utf-8"))
            
            # 5. Call LLM Service for batch translation
            async with httpx.AsyncClient() as client:
                llm_resp = await client.post(
                    f"{LLM_SERVICE_URL}/translate/batch",
                    json={
                        "translations": data,
                        "target_language": target_lang
                    },
                    timeout=30.0
                )
                if llm_resp.status_code == 200:
                    translated_data = llm_resp.json().get("translations", data)
                    translated_body = json.dumps(translated_data).encode("utf-8")
                    
                    # Create a new response with the translated body
                    new_headers = dict(response.headers)
                    new_headers.pop("content-length", None)
                    return Response(
                        content=translated_body,
                        status_code=response.status_code,
                        headers=new_headers,
                        media_type="application/json"
                    )
                else:
                    logger.warning(f"Translation failed with status {llm_resp.status_code}: {llm_resp.text}")
        except Exception as e:
            logger.error(f"Error during translation interception: {e}")
            
        # Fallback to original response if anything fails
        # Ensure we don't break content-length for the original response either, 
        # just let Response recalculate it since we've read the body.
        fallback_headers = dict(response.headers)
        fallback_headers.pop("content-length", None)
        return Response(
            content=body,
            status_code=response.status_code,
            headers=fallback_headers,
            media_type="application/json"
        )
