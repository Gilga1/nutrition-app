from __future__ import annotations

import io
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, UnidentifiedImageError

from .config import get_settings
from .schemas import HealthResponse, MealEstimate
from .vision import VisionEstimator

# Load repo-root .env then backend/.env
_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(_ROOT / ".env")
load_dotenv(Path(__file__).resolve().parents[1] / ".env", override=True)

ALLOWED_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"}


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    app.state.settings = settings
    app.state.estimator = None
    if settings.vision_configured:
        app.state.estimator = VisionEstimator(settings)
    yield


app = FastAPI(
    title="North Indian Meal Calorie Estimator",
    version="0.1.0",
    lifespan=lifespan,
)

settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health", response_model=HealthResponse)
def health() -> HealthResponse:
    s = app.state.settings
    return HealthResponse(
        status="ok",
        model=s.vision_model,
        vision_configured=s.vision_configured,
    )


@app.post("/api/estimate", response_model=MealEstimate)
async def estimate_meal(file: UploadFile = File(...)) -> MealEstimate:
    settings = app.state.settings
    estimator: VisionEstimator | None = app.state.estimator

    if estimator is None:
        raise HTTPException(
            status_code=503,
            detail="Vision API not configured. Set NVIDIA_API_KEY in .env and restart.",
        )

    content_type = (file.content_type or "").lower()
    if content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{content_type}'. Use JPG, PNG, or WEBP.",
        )

    raw = await file.read()
    max_bytes = settings.max_upload_mb * 1024 * 1024
    if len(raw) > max_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"Image too large. Max {settings.max_upload_mb} MB.",
        )
    if not raw:
        raise HTTPException(status_code=400, detail="Empty upload.")

    try:
        with Image.open(io.BytesIO(raw)) as img:
            img.verify()
    except UnidentifiedImageError as exc:
        raise HTTPException(status_code=400, detail="Invalid image file.") from exc

    mime = content_type if content_type != "image/jpg" else "image/jpeg"

    try:
        return estimator.estimate(raw, mime)
    except Exception as exc:  # noqa: BLE001 — surface model/API failures cleanly
        raise HTTPException(
            status_code=502,
            detail=f"Vision estimation failed: {exc}",
        ) from exc
