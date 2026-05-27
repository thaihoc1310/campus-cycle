import os
import shutil
import uuid

from fastapi import HTTPException, UploadFile, status

from app.config import settings

ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}


def delete_upload(path: str | None) -> None:
    if not path or not path.startswith("/uploads/"):
        return

    upload_root = os.path.abspath(settings.UPLOAD_DIR)
    relative_path = path.removeprefix("/uploads/").lstrip("/")
    full_path = os.path.abspath(os.path.join(upload_root, relative_path))
    if not full_path.startswith(upload_root):
        return
    if os.path.exists(full_path):
        os.remove(full_path)


def replace_upload(file: UploadFile, folder: str, old_path: str | None = None) -> str:
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only image files are allowed",
        )

    target_dir = os.path.join(settings.UPLOAD_DIR, folder)
    os.makedirs(target_dir, exist_ok=True)

    filename = f"{uuid.uuid4()}{ext}"
    full_path = os.path.join(target_dir, filename)
    file.file.seek(0)
    with open(full_path, "wb") as output:
        shutil.copyfileobj(file.file, output)

    new_path = f"/uploads/{folder}/{filename}"
    delete_upload(old_path)
    return new_path

