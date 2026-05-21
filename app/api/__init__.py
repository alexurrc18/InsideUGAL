from fastapi import APIRouter

api_router = APIRouter()

@api_router.get("/status")
def status():
    return {"status": "API OK"}