"""Download Wikimedia Commons images for the local demo dataset.

Run after ``python -m app.seed``:
    PYTHONPATH=. venv/bin/python -m app.seed_images

Images are searched on Wikimedia Commons, downloaded into ``backend/uploads``,
and linked to item/campaign records. Attribution metadata is written to
``backend/uploads/ATTRIBUTION.json``.
"""
from __future__ import annotations

import html
import json
import os
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

COMMONS_API = "https://commons.wikimedia.org/w/api.php"
USER_AGENT = "CampusCycleDemoSeeder/1.0 (local development fixture)"
ITEM_IMAGE_COUNT = 2
CAMPAIGN_IMAGE_COUNT = 3
SEARCH_LIMIT = 28
MAX_DOWNLOAD_BYTES = 6 * 1024 * 1024
REQUEST_RETRIES = 6
REQUEST_DELAY_SECONDS = 0.7
ALLOWED_MIME_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}

CATEGORY_QUERIES = {
    "Books": "books textbook study desk",
    "Electronics": "consumer electronics appliance desk",
    "Clothing": "clothing jacket scarf clothes",
    "Furniture": "furniture chair table shelf room",
    "Sports": "sports equipment bicycle racket ball",
    "Stationery": "stationery notebook school supplies desk",
    "Household": "household kitchen home essentials",
    "Other": "reusable household item",
}

CAMPAIGN_QUERIES = {
    "Green Dorm Donation Drive": "student dorm room donation household essentials",
    "Community Garden Expansion": "community garden volunteers planting vegetables",
    "Responsible E-Waste Collection": "electronic waste recycling collection",
    "Community Repair Lab": "repair cafe tools workshop",
    "Books for Freshers": "books library students textbooks",
    "Emergency Student Support Fund": "student community support volunteers",
    "Winter Clothing Share 2025": "winter clothing donation jackets scarves",
}


def clean_text(value: str) -> str:
    without_tags = re.sub(r"<[^>]+>", " ", value or "")
    return re.sub(r"\s+", " ", html.unescape(without_tags)).strip()


def metadata_value(metadata: dict, key: str) -> str:
    return clean_text(metadata.get(key, {}).get("value", ""))


def open_with_retry(request: Request, *, timeout: int):
    for attempt in range(REQUEST_RETRIES):
        try:
            response = urlopen(request, timeout=timeout)
            time.sleep(REQUEST_DELAY_SECONDS)
            return response
        except HTTPError as error:
            if error.code != 429 or attempt == REQUEST_RETRIES - 1:
                raise
            retry_after = error.headers.get("Retry-After")
            delay = int(retry_after) if retry_after and retry_after.isdigit() else min(60, 4 * (2 ** attempt))
            print(f"  Wikimedia rate limit reached; retrying in {delay}s...")
            time.sleep(delay)
        except URLError:
            if attempt == REQUEST_RETRIES - 1:
                raise
            delay = min(30, 2 * (2 ** attempt))
            print(f"  Temporary network error; retrying in {delay}s...")
            time.sleep(delay)
    raise RuntimeError("Request retries exhausted")


def request_json(params: dict[str, str | int]) -> dict:
    url = f"{COMMONS_API}?{urlencode(params)}"
    request = Request(url, headers={"User-Agent": USER_AGENT})
    with open_with_retry(request, timeout=30) as response:
        return json.load(response)


def search_commons(query: str, cache: dict[str, list[dict]]) -> list[dict]:
    if query in cache:
        return cache[query]

    payload = request_json({
        "action": "query",
        "format": "json",
        "generator": "search",
        "gsrnamespace": 6,
        "gsrlimit": SEARCH_LIMIT,
        "gsrsearch": f"{query} filetype:bitmap",
        "prop": "imageinfo",
        "iiprop": "url|mime|size|extmetadata",
        "iiurlwidth": 1200,
    })
    pages = payload.get("query", {}).get("pages", {}).values()
    candidates = []
    for page in sorted(pages, key=lambda entry: entry.get("index", 999)):
        image_info = (page.get("imageinfo") or [{}])[0]
        mime = image_info.get("mime", "")
        if mime not in ALLOWED_MIME_TYPES:
            continue
        if image_info.get("width", 0) < 500 or image_info.get("height", 0) < 350:
            continue
        candidates.append({
            "title": page.get("title", ""),
            "source_url": image_info.get("url", ""),
            "download_url": image_info.get("thumburl") or image_info.get("url", ""),
            "description_url": image_info.get("descriptionurl", ""),
            "mime": mime,
            "metadata": image_info.get("extmetadata", {}),
            "search_query": query,
        })
    cache[query] = candidates
    return candidates


def item_queries(item: Item) -> list[str]:
    category_name = item.category.name if item.category else "Other"
    return [
        item.title,
        CATEGORY_QUERIES.get(category_name, category_name),
        f"{category_name} reusable item",
    ]


def campaign_queries(campaign: Campaign) -> list[str]:
    return [
        CAMPAIGN_QUERIES.get(campaign.title, campaign.title),
        campaign.title,
        f"campus community {campaign.type}",
    ]


def select_candidates(
    queries: list[str],
    count: int,
    search_cache: dict[str, list[dict]],
    used_source_urls: set[str],
) -> list[dict]:
    selected = []
    selected_urls = set()

    for query in queries:
        for candidate in search_commons(query, search_cache):
            source_url = candidate["source_url"]
            if not source_url or source_url in selected_urls or source_url in used_source_urls:
                continue
            selected.append(candidate)
            selected_urls.add(source_url)
            used_source_urls.add(source_url)
            if len(selected) == count:
                return selected

    # Reuse a source across different records only as a last resort. Each
    # record still receives distinct images.
    for query in queries:
        for candidate in search_commons(query, search_cache):
            source_url = candidate["source_url"]
            if not source_url or source_url in selected_urls:
                continue
            selected.append(candidate)
            selected_urls.add(source_url)
            if len(selected) == count:
                return selected

    raise RuntimeError(f"Could not find {count} usable Commons images for queries: {queries}")


def download_candidate(candidate: dict, target_dir: Path) -> tuple[Path, dict]:
    request = Request(candidate["download_url"], headers={"User-Agent": USER_AGENT})
    with open_with_retry(request, timeout=45) as response:
        content_type = response.headers.get_content_type()
        extension = ALLOWED_MIME_TYPES.get(content_type)
        if not extension:
            raise RuntimeError(f"Unsupported image content type: {content_type}")
        content = response.read(MAX_DOWNLOAD_BYTES + 1)
    if len(content) > MAX_DOWNLOAD_BYTES:
        raise RuntimeError(f"Image exceeds {MAX_DOWNLOAD_BYTES} bytes: {candidate['download_url']}")

    target_dir.mkdir(parents=True, exist_ok=True)
    target_path = target_dir / f"{uuid.uuid4()}{extension}"
    target_path.write_bytes(content)

    metadata = candidate["metadata"]
    attribution = {
        "local_file": "",
        "commons_title": candidate["title"],
        "source_url": candidate["source_url"],
        "description_url": candidate["description_url"],
        "search_query": candidate["search_query"],
        "author": metadata_value(metadata, "Artist"),
        "credit": metadata_value(metadata, "Credit"),
        "license": metadata_value(metadata, "LicenseShortName"),
        "license_url": metadata_value(metadata, "LicenseUrl"),
        "image_description": metadata_value(metadata, "ImageDescription"),
    }
    return target_path, attribution


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

        search_cache: dict[str, list[dict]] = {}
        used_source_urls: set[str] = set()
        item_records: list[tuple[Item, str, bool]] = []
        campaign_records: list[tuple[Campaign, str, bool]] = []
        attribution_records = []

        print(f"Downloading {len(items) * ITEM_IMAGE_COUNT} item images...")
        for index, item in enumerate(items, start=1):
            candidates = select_candidates(item_queries(item), ITEM_IMAGE_COUNT, search_cache, used_source_urls)
            for image_index, candidate in enumerate(candidates):
                relative_dir = Path("items") / str(item.id)
                target_path, attribution = download_candidate(candidate, staging_root / relative_dir)
                relative_path = relative_dir / target_path.name
                image_path = f"/uploads/{relative_path.as_posix()}"
                attribution["local_file"] = image_path
                attribution_records.append(attribution)
                item_records.append((item, image_path, image_index == 0))
            print(f"  [{index:02d}/{len(items):02d}] {item.title}")

        print(f"Downloading {len(campaigns) * CAMPAIGN_IMAGE_COUNT} campaign images...")
        for index, campaign in enumerate(campaigns, start=1):
            candidates = select_candidates(
                campaign_queries(campaign),
                CAMPAIGN_IMAGE_COUNT,
                search_cache,
                used_source_urls,
            )
            for image_index, candidate in enumerate(candidates):
                relative_dir = Path("campaigns") / str(campaign.id)
                target_path, attribution = download_candidate(candidate, staging_root / relative_dir)
                relative_path = relative_dir / target_path.name
                image_path = f"/uploads/{relative_path.as_posix()}"
                attribution["local_file"] = image_path
                attribution_records.append(attribution)
                campaign_records.append((campaign, image_path, image_index == 0))
            print(f"  [{index:02d}/{len(campaigns):02d}] {campaign.title}")

        db.query(ItemImage).delete(synchronize_session=False)
        db.query(CampaignImage).delete(synchronize_session=False)
        for folder in ("items", "campaigns"):
            shutil.rmtree(upload_root / folder, ignore_errors=True)
            staged_folder = staging_root / folder
            if staged_folder.exists():
                shutil.move(str(staged_folder), str(upload_root / folder))

        for item, image_path, is_main in item_records:
            db.add(ItemImage(item_id=item.id, image_path=image_path, is_main=is_main))
        for campaign, image_path, is_main in campaign_records:
            db.add(CampaignImage(campaign_id=campaign.id, image_path=image_path, is_main=is_main))
        db.commit()

        manifest_path = upload_root / "ATTRIBUTION.json"
        manifest_path.write_text(
            json.dumps({
                "source": "Wikimedia Commons",
                "source_api": COMMONS_API,
                "note": "Review each linked Commons description page for license requirements before redistribution.",
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
