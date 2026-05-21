from fastapi import FastAPI
from app.api import api_router
from app.db.database import engine
from app.models import models

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="InsideUGAL API", version="1.0.0")
app.include_router(api_router, prefix="/api")


@app.get("/")
def read_root():
    return {"message": "Backend-ul InsideUGAL rulează cu succes!"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}