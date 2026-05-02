"""
Upload the generated tiles/ directory to Cloudflare R2.

Usage:
    python upload_tiles.py

Set these environment variables first (or edit the CONFIG section below):
    R2_ACCOUNT_ID   — your Cloudflare Account ID
    R2_ACCESS_KEY   — R2 API Token Access Key ID
    R2_SECRET_KEY   — R2 API Token Secret Access Key
    R2_BUCKET       — your R2 bucket name

How to get credentials:
    1. Cloudflare Dashboard → R2 → Manage R2 API Tokens
    2. Create token with "Edit" permission for your bucket
    3. Copy Account ID from the R2 overview page (top-right)
"""

import os
import sys
import boto3
from botocore.config import Config

# ── CONFIG ────────────────────────────────────────────────────────────────────
# Either set environment variables or hardcode here (do NOT commit secrets!)
ACCOUNT_ID  = os.environ.get("R2_ACCOUNT_ID",  "YOUR_ACCOUNT_ID")
ACCESS_KEY  = os.environ.get("R2_ACCESS_KEY",  "YOUR_ACCESS_KEY")
SECRET_KEY  = os.environ.get("R2_SECRET_KEY",  "YOUR_SECRET_KEY")
BUCKET_NAME = os.environ.get("R2_BUCKET",      "YOUR_BUCKET_NAME")

TILES_DIR   = "tiles"          # local folder to upload
R2_PREFIX   = "tiles"          # prefix (folder) inside the bucket
# ──────────────────────────────────────────────────────────────────────────────


def upload_tiles() -> None:
    if "YOUR_" in ACCOUNT_ID or "YOUR_" in ACCESS_KEY:
        print("ERROR: Set R2_ACCOUNT_ID, R2_ACCESS_KEY, R2_SECRET_KEY, R2_BUCKET first.")
        print("  Either as env vars or by editing the CONFIG section in this script.")
        sys.exit(1)

    if not os.path.isdir(TILES_DIR):
        print(f"ERROR: tiles directory not found: {os.path.abspath(TILES_DIR)}")
        print("Run generate_tiles.py first.")
        sys.exit(1)

    endpoint = f"https://{ACCOUNT_ID}.r2.cloudflarestorage.com"
    print(f"Connecting to R2 bucket '{BUCKET_NAME}'...")

    s3 = boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=ACCESS_KEY,
        aws_secret_access_key=SECRET_KEY,
        config=Config(signature_version="s3v4"),
        region_name="auto",
    )

    # Count files first
    all_files = []
    for root, _, files in os.walk(TILES_DIR):
        for f in files:
            if f.endswith(".png"):
                all_files.append(os.path.join(root, f))

    total = len(all_files)
    print(f"Uploading {total} tiles...")

    for i, local_path in enumerate(all_files, 1):
        # Build the R2 key: tiles/z/x/y.png
        rel = os.path.relpath(local_path, TILES_DIR).replace("\\", "/")
        key = f"{R2_PREFIX}/{rel}"

        s3.upload_file(
            local_path,
            BUCKET_NAME,
            key,
            ExtraArgs={"ContentType": "image/png", "CacheControl": "public, max-age=31536000"},
        )

        if i % 50 == 0 or i == total:
            pct = i * 100 // total
            print(f"  [{pct:3d}%] {i}/{total}  ({key})", end="\r")

    print(f"\nUpload complete! {total} tiles at: https://pub-*.r2.dev/{R2_PREFIX}/{{z}}/{{x}}/{{y}}.png")


if __name__ == "__main__":
    upload_tiles()
