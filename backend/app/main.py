import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.routers import auth, users, organizations, categories, items, campaigns, transactions, dashboard, client

app = FastAPI(title="Campus Cycle API", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for uploads
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(organizations.router)
app.include_router(categories.router)
app.include_router(items.router)
app.include_router(campaigns.router)
app.include_router(transactions.router)
app.include_router(dashboard.router)
app.include_router(client.router)


@app.get("/api/health")
def health_check():
    return {"status": "ok"}
