"""
IdentityVerse AI -- backend entrypoint.

Run locally:
    uvicorn app.main:app --reload --port 8000

First run automatically generates synthetic data and computes risk scores
if the database is empty, so `uvicorn app.main:app` alone is enough to get
a fully working API with realistic data -- no manual data-gen step required.
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import config, db
from app.data_gen import generate_synthetic_data
from app.services import pipeline
from app.routers import dashboard, identities, graph, blast_radius, copilot, timeline, auth


@asynccontextmanager
async def lifespan(app: FastAPI):
    if db.users.count() == 0:
        print("No data found -- generating synthetic dataset...")
        generate_synthetic_data.generate()
    if db.unified_identities.count() == 0:
        print("Running identity resolution + risk scoring pipeline...")
        pipeline.run_pipeline()
    print("IdentityVerse AI backend ready.")
    yield


app = FastAPI(
    title="IdentityVerse AI",
    description="AI-Powered Identity Sprawl & Privileged Access Abuse Detection Platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(identities.router)
app.include_router(graph.router)
app.include_router(blast_radius.router)
app.include_router(copilot.router)
app.include_router(timeline.router)


@app.get("/health")
def health():
    return {"status": "ok", "identities_loaded": db.unified_identities.count()}
