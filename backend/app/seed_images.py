"""Download online images for the local demo dataset.

Run after ``python -m app.seed``:
    PYTHONPATH=. venv/bin/python -m app.seed_images

The importer searches Openverse for Creative Commons images, stores files in
``backend/uploads``, links them to item/campaign rows, and writes source
metadata to ``backend/uploads/ATTRIBUTION.json``.
"""
from __future__ import annotations

import hashlib
import json
import re
import shutil
import time
import uuid
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from app.config import settings
from app.database import SessionLocal
from app.models.campaign import Campaign, CampaignImage
from app.models.item import Item, ItemImage

OPENVERSE_API = "https://api.openverse.org/v1/images/"
USER_AGENT = "CampusCycleDemoSeeder/1.0 (local development fixture)"
ITEM_IMAGE_COUNT = 2
CAMPAIGN_IMAGE_COUNT = 3
MAX_DOWNLOAD_BYTES = 6 * 1024 * 1024
REQUEST_RETRIES = 4
REQUEST_DELAY_SECONDS = 0.3
SEARCH_PAGE_SIZE = 20
SEARCH_PAGES_PER_QUERY = 1
ALLOWED_MIME_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}

CATEGORY_QUERIES = {
    "Books": "student textbooks study books",
    "Electronics": "desk electronics appliance",
    "Clothing": "clothing jacket scarf",
    "Furniture": "student room furniture chair table",
    "Sports": "sports equipment campus",
    "Stationery": "notebooks stationery school supplies",
    "Household": "kitchen household dorm room",
    "Other": "campus student reusable item",
}

CAMPAIGN_QUERIES = {
    "Green Dorm Donation Drive": "student dorm room donation",
    "Community Garden Expansion": "community garden volunteers",
    "Responsible E-Waste Collection": "electronic waste recycling",
    "Community Repair Lab": "repair tools workshop",
    "Books for Freshers": "books library students",
    "Emergency Student Support Fund": "student community support",
    "Winter Clothing Share 2025": "winter clothing donation",
}


def open_with_retry(request: Request, *, timeout: int):
    for attempt in range(REQUEST_RETRIES):
        try:
            response = urlopen(request, timeout=timeout)
            time.sleep(REQUEST_DELAY_SECONDS)
            return response
        except HTTPError as error:
            if error.code in {400, 401, 403, 404, 410, 424}:
                raise
            if attempt == REQUEST_RETRIES - 1:
                raise
            retry_after = error.headers.get("Retry-After")
            delay = min(int(retry_after), 12) if retry_after and retry_after.isdigit() else min(12, 2 * (2 ** attempt))
            print(f"  Image source returned HTTP {error.code}; retrying in {delay}s...")
            time.sleep(delay)
        except URLError:
            if attempt == REQUEST_RETRIES - 1:
                raise
            delay = min(10, 2 * (2 ** attempt))
            print(f"  Temporary network error; retrying in {delay}s...")
            time.sleep(delay)
    raise RuntimeError("Request retries exhausted")


def request_json(url: str) -> dict:
    request = Request(url, headers={"User-Agent": USER_AGENT})
    with open_with_retry(request, timeout=30) as response:
        return json.load(response)


def normalize_query(value: str) -> str:
    words = re.findall(r"[A-Za-z0-9]+", value.lower())
    return " ".join(words[:6]) or "campus student"


def item_queries(item: Item) -> list[str]:
    category_name = item.category.name if item.category else "Other"
    return [
        normalize_query(item.title),
        CATEGORY_QUERIES.get(category_name, normalize_query(category_name)),
        "college campus student item",
    ]


def campaign_queries(campaign: Campaign) -> list[str]:
    if campaign.title == "Responsible E-Waste Collection":
        return [
            "computer recycling",
            "electronic waste",
            "recycling center",
            "campus sustainability",
        ]
    return [
        CAMPAIGN_QUERIES.get(campaign.title, normalize_query(campaign.title)),
        normalize_query(campaign.title),
        f"campus community {campaign.type}",
    ]


def search_openverse(query: str, cache: dict[tuple[str, int], list[dict]], page: int) -> list[dict]:
    cache_key = (query, page)
    if cache_key in cache:
        return cache[cache_key]

    url = f"{OPENVERSE_API}?{urlencode({'q': query, 'page_size': SEARCH_PAGE_SIZE, 'page': page})}"
    payload = request_json(url)
    candidates = []
    for result in payload.get("results", []):
        image_url = result.get("url")
        thumbnail_url = result.get("thumbnail")
        source_url = result.get("foreign_landing_url") or image_url
        if not image_url or result.get("mature"):
            continue
        candidates.append({
            "download_url": thumbnail_url or image_url,
            "original_url": image_url,
            "source_url": source_url,
            "description_url": source_url,
            "provider": result.get("provider") or result.get("source") or "openverse",
            "title": result.get("title") or "",
            "creator": result.get("creator") or "",
            "creator_url": result.get("creator_url") or "",
            "license": result.get("license") or "",
            "license_version": result.get("license_version") or "",
            "license_url": result.get("license_url") or "",
            "attribution": result.get("attribution") or "",
            "width": result.get("width"),
            "height": result.get("height"),
            "search_query": query,
        })

    cache[cache_key] = candidates
    return candidates


def candidate_stream(
    queries: list[str],
    search_cache: dict[tuple[str, int], list[dict]],
    used_source_urls: set[str],
):
    yielded_urls = set()
    for page in range(1, SEARCH_PAGES_PER_QUERY + 1):
        for query in queries:
            for candidate in search_openverse(query, search_cache, page):
                source_url = candidate["source_url"]
                if source_url in yielded_urls or source_url in used_source_urls:
                    continue
                yielded_urls.add(source_url)
                yield candidate


def download_image(candidate: dict, target_dir: Path) -> tuple[Path, dict, str]:
    request = Request(candidate["download_url"], headers={"User-Agent": USER_AGENT})
    with open_with_retry(request, timeout=45) as response:
        content_type = response.headers.get_content_type()
        extension = ALLOWED_MIME_TYPES.get(content_type)
        if not extension:
            raise RuntimeError(f"Unsupported image content type: {content_type}")
        content = response.read(MAX_DOWNLOAD_BYTES + 1)

    if len(content) > MAX_DOWNLOAD_BYTES:
        raise RuntimeError(f"Image exceeds {MAX_DOWNLOAD_BYTES} bytes: {candidate['download_url']}")

    content_hash = hashlib.sha256(content).hexdigest()
    target_dir.mkdir(parents=True, exist_ok=True)
    target_path = target_dir / f"{uuid.uuid4()}{extension}"
    target_path.write_bytes(content)

    attribution = {
        "local_file": "",
        "provider": candidate["provider"],
        "title": candidate["title"],
        "source_url": candidate["source_url"],
        "description_url": candidate["description_url"],
        "download_url": candidate["download_url"],
        "original_url": candidate["original_url"],
        "search_query": candidate["search_query"],
        "creator": candidate["creator"],
        "creator_url": candidate["creator_url"],
        "license": candidate["license"],
        "license_version": candidate["license_version"],
        "license_url": candidate["license_url"],
        "attribution": candidate["attribution"],
        "width": candidate["width"],
        "height": candidate["height"],
        "sha256": content_hash,
    }
    return target_path, attribution, content_hash


def select_and_download(
    queries: list[str],
    count: int,
    relative_dir: Path,
    staging_root: Path,
    search_cache: dict[tuple[str, int], list[dict]],
    used_source_urls: set[str],
    used_hashes: set[str],
) -> list[tuple[str, dict]]:
    selected = []
    for candidate in candidate_stream(queries, search_cache, used_source_urls):
        try:
            target_path, attribution, content_hash = download_image(candidate, staging_root / relative_dir)
        except (HTTPError, URLError, RuntimeError) as error:
            print(f"  Skipped image candidate ({error})")
            continue

        if content_hash in used_hashes:
            target_path.unlink(missing_ok=True)
            continue

        used_hashes.add(content_hash)
        used_source_urls.add(candidate["source_url"])
        relative_path = relative_dir / target_path.name
        image_path = f"/uploads/{relative_path.as_posix()}"
        attribution["local_file"] = image_path
        selected.append((image_path, attribution))
        if len(selected) == count:
            return selected

    raise RuntimeError(f"Could not find {count} unique images for queries: {queries}")


def seed_images() -> None:
    upload_root = Path(settings.UPLOAD_DIR).resolve()
    staging_root = upload_root / ".seed-images-staging"
    shutil.rmtree(staging_root, ignore_errors=True)

    db = SessionLocal()
    try:
        items = db.query(Item).order_by(Item.created_at.asc()).all()
        campaigns = db.query(Campaign).order_by(Campaign.created_at.asc()).all()
        if not items or not campaigns:
            raise RuntimeError("Seed items and campaigns before downloading images.")

        search_cache: dict[tuple[str, int], list[dict]] = {}
        used_source_urls: set[str] = set()
        used_hashes: set[str] = set()
        item_records: list[tuple[str, str, bool]] = []
        campaign_records: list[tuple[str, str, bool]] = []
        attribution_records = []

        print(f"Downloading {len(items) * ITEM_IMAGE_COUNT} item images...")
        for index, item in enumerate(items, start=1):
            relative_dir = Path("items") / str(item.id)
            images = select_and_download(
                item_queries(item),
                ITEM_IMAGE_COUNT,
                relative_dir,
                staging_root,
                search_cache,
                used_source_urls,
                used_hashes,
            )
            for image_index, (image_path, attribution) in enumerate(images):
                attribution_records.append(attribution)
                item_records.append((item.id, image_path, image_index == 0))
            print(f"  [{index:02d}/{len(items):02d}] {item.title}")

        print(f"Downloading {len(campaigns) * CAMPAIGN_IMAGE_COUNT} campaign images...")
        for index, campaign in enumerate(campaigns, start=1):
            relative_dir = Path("campaigns") / str(campaign.id)
            images = select_and_download(
                campaign_queries(campaign),
                CAMPAIGN_IMAGE_COUNT,
                relative_dir,
                staging_root,
                search_cache,
                used_source_urls,
                used_hashes,
            )
            for image_index, (image_path, attribution) in enumerate(images):
                attribution_records.append(attribution)
                campaign_records.append((campaign.id, image_path, image_index == 0))
            print(f"  [{index:02d}/{len(campaigns):02d}] {campaign.title}")

        db.query(ItemImage).delete(synchronize_session=False)
        db.query(CampaignImage).delete(synchronize_session=False)
        for folder in ("items", "campaigns"):
            shutil.rmtree(upload_root / folder, ignore_errors=True)
            staged_folder = staging_root / folder
            if staged_folder.exists():
                shutil.move(str(staged_folder), str(upload_root / folder))

        for item_id, image_path, is_main in item_records:
            db.add(ItemImage(item_id=item_id, image_path=image_path, is_main=is_main))
        for campaign_id, image_path, is_main in campaign_records:
            db.add(CampaignImage(campaign_id=campaign_id, image_path=image_path, is_main=is_main))
        db.commit()

        manifest_path = upload_root / "ATTRIBUTION.json"
        manifest_path.write_text(
            json.dumps({
                "source": "Openverse",
                "source_api": OPENVERSE_API,
                "note": "Review each source URL and license before redistributing outside local demo use.",
                "images": attribution_records,
            }, indent=2, ensure_ascii=True),
            encoding="utf-8",
        )
        print("")
        print(f"Imported {len(item_records)} item images and {len(campaign_records)} campaign images.")
        print(f"Attribution manifest: {manifest_path}")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
        shutil.rmtree(staging_root, ignore_errors=True)


if __name__ == "__main__":
    seed_images()
