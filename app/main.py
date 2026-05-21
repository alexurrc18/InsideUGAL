from fastapi import FastAPI

from app.api import announcements, courses, faculties, users
from app.db.database import Base, engine
from app.models import models


Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="InsideUGAL API",
    description="REST API pentru platforma academica InsideUGAL.",
    version="0.1.0",
)


@app.get("/")
def read_root():
    return {"message": "InsideUGAL API ruleaza."}


@app.get("/health")
def health_check():
    return {"status": "ok"}


app.include_router(users.router)
app.include_router(faculties.router)
app.include_router(courses.router)
app.include_router(announcements.router)
