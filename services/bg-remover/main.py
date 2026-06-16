import io
import os
from urllib.parse import urlparse

import requests
from fastapi import Depends, FastAPI, File, Header, HTTPException, Request, UploadFile
from fastapi.responses import Response
from rembg import new_session, remove

app = FastAPI(title="Lekhon Background Remover")
session = new_session("u2net")

MAX_IMAGE_BYTES = int(os.getenv("MAX_IMAGE_BYTES", "8388608"))
ALLOWED_IMAGE_HOSTS = [host.strip().lower() for host in os.getenv("ALLOWED_IMAGE_HOSTS", "").split(",") if host.strip()]
API_KEY = os.getenv("BG_REMOVER_API_KEY", "")


def require_api_key(x_api_key: str = Header(default="")):
    if not API_KEY or x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")


def validate_image_bytes(data: bytes):
    if not data:
        raise HTTPException(status_code=400, detail="Image is required")
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Image is too large")
    return data


def fetch_image(url: str) -> bytes:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        raise HTTPException(status_code=400, detail="Unsupported image URL")
    hostname = (parsed.hostname or "").lower()
    if not hostname:
        raise HTTPException(status_code=400, detail="Invalid image URL")
    if ALLOWED_IMAGE_HOSTS and hostname not in ALLOWED_IMAGE_HOSTS:
        raise HTTPException(status_code=400, detail="Image host is not allowed")

    response = requests.get(url, timeout=15, stream=True)
    response.raise_for_status()
    content_type = response.headers.get("content-type", "")
    if not content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="URL did not return an image")
    return validate_image_bytes(response.content)


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/remove-background", dependencies=[Depends(require_api_key)])
async def remove_background(request: Request, image: UploadFile | None = File(default=None)):
    if image is not None:
        if image.content_type and not image.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="Only image files are supported")
        input_bytes = validate_image_bytes(await image.read())
    else:
        payload = await request.json()
        image_url = payload.get("imageUrl", "") if isinstance(payload, dict) else ""
        if not image_url:
            raise HTTPException(status_code=400, detail="Provide image file or imageUrl")
        try:
            input_bytes = fetch_image(image_url)
        except requests.RequestException as exc:
            raise HTTPException(status_code=400, detail="Could not download image") from exc

    output = remove(input_bytes, session=session)
    return Response(content=io.BytesIO(output).getvalue(), media_type="image/png")
