"""
Generate Leaflet-compatible TMS tiles from a large Minecraft map PNG.

Usage:
    python generate_tiles.py <input_image.png> [output_dir]

Default output dir: "tiles" (created next to this script)

Tile format: tiles/{z}/{x}/{y}.png  (TMS: y=0 at bottom)
Compatible with Leaflet tileLayer option tms: true
"""

import sys
import os
from PIL import Image

TILE_SIZE = 256
MIN_ZOOM = 0
MAX_ZOOM = 6  # For 16384×16384 map: 64×64 tiles at max zoom

# Disable Pillow's decompression bomb check for large legitimate images
Image.MAX_IMAGE_PIXELS = None


def generate_tiles(image_path: str, output_dir: str) -> None:
    print(f"Loading {image_path}...")
    img = Image.open(image_path).convert("RGB")
    width, height = img.size
    print(f"Image size: {width}×{height}")

    if width != height:
        print("WARNING: Image is not square — tiles may not align correctly")

    native_size = max(width, height)
    # Pad to next power-of-2 multiple of TILE_SIZE if needed
    max_tiles = 2 ** MAX_ZOOM  # 64 at zoom 6
    expected_size = max_tiles * TILE_SIZE  # 16384

    if native_size != expected_size:
        print(f"Resizing to {expected_size}×{expected_size} to match zoom levels...")
        img = img.resize((expected_size, expected_size), Image.LANCZOS)

    total_tiles = sum((2**z) ** 2 for z in range(MIN_ZOOM, MAX_ZOOM + 1))
    done = 0
    print(f"Generating {total_tiles} tiles across zoom levels {MIN_ZOOM}–{MAX_ZOOM}...")

    for zoom in range(MIN_ZOOM, MAX_ZOOM + 1):
        num_tiles = 2**zoom  # tiles per side at this zoom
        # How many source pixels each tile covers
        px_per_tile = expected_size // num_tiles

        for x in range(num_tiles):
            for y_tms in range(num_tiles):
                # TMS y=0 is bottom → convert to image coords (origin top-left)
                y_img = (num_tiles - 1) - y_tms

                left = x * px_per_tile
                upper = y_img * px_per_tile
                right = left + px_per_tile
                lower = upper + px_per_tile

                tile = img.crop((left, upper, right, lower))

                if tile.size != (TILE_SIZE, TILE_SIZE):
                    tile = tile.resize((TILE_SIZE, TILE_SIZE), Image.LANCZOS)

                tile_dir = os.path.join(output_dir, str(zoom), str(x))
                os.makedirs(tile_dir, exist_ok=True)
                tile.save(os.path.join(tile_dir, f"{y_tms}.png"), "PNG", optimize=True)

                done += 1
                if done % 100 == 0 or done == total_tiles:
                    pct = done * 100 // total_tiles
                    print(f"  [{pct:3d}%] {done}/{total_tiles} tiles  (zoom {zoom})", end="\r")

    print(f"\nDone! Tiles saved to: {os.path.abspath(output_dir)}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python generate_tiles.py <input_image.png> [output_dir]")
        sys.exit(1)

    input_image = sys.argv[1]
    output_directory = sys.argv[2] if len(sys.argv) > 2 else "tiles"

    if not os.path.isfile(input_image):
        print(f"Error: file not found: {input_image}")
        sys.exit(1)

    generate_tiles(input_image, output_directory)
