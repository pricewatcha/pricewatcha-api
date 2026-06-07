#!/usr/bin/env python3
"""Generate MCP favicons from the price_tracker logo pipeline (binocular mark, square).

Source: ../price_tracker/app/static/img/pricewatcha-logo-betaV2.png
Logic aligned with price_tracker/scripts/build_favicons.py (crop mark, BMP .ico).

Requires Pillow (e.g. price_tracker/.venv): pip install pillow
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Pillow required: pip install pillow (or use price_tracker/.venv/bin/python)", file=sys.stderr)
    raise SystemExit(1) from None

API_ROOT = Path(__file__).resolve().parents[2]
PRICE_TRACKER_ROOT = Path(os.environ.get("PRICE_TRACKER_ROOT", API_ROOT.parent / "price_tracker"))
SRC = PRICE_TRACKER_ROOT / "app" / "static" / "img" / "pricewatcha-logo-betaV2.png"
OUT_DIR = Path(__file__).resolve().parents[1] / "public"

# Tuned for pricewatcha-logo-betaV2.png (1140×300) — keep in sync with price_tracker/scripts/build_favicons.py
MARK_CROP_BOX = (730, 22, 1140, 298)
BLEACH_CORNER_W_FRAC = 0.26
BLEACH_CORNER_H_FRAC = 0.30


def bleach_beta_badge_corner(im: Image.Image) -> Image.Image:
    out = im.copy()
    w, h = out.size
    cw = max(1, int(w * BLEACH_CORNER_W_FRAC))
    ch = max(1, int(h * BLEACH_CORNER_H_FRAC))
    px = out.load()
    for y in range(ch):
        for x in range(cw):
            r, g, b, a = px[x, y]
            if a < 12:
                continue
            if r + g + b < 280:
                continue
            if b > 210 and r < 110 and 85 < g < 215:
                px[x, y] = (255, 255, 255, 255)
                continue
            if b > 228 and g > 200 and r > 150 and (b - r) > 35:
                px[x, y] = (255, 255, 255, 255)
    return out


def fit_in_square(img: Image.Image, side: int) -> Image.Image:
    w, h = img.size
    scale = min(side / w, side / h)
    new_w = max(1, int(round(w * scale)))
    new_h = max(1, int(round(h * scale)))
    resized = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (side, side), (255, 255, 255, 0))
    x = (side - new_w) // 2
    y = (side - new_h) // 2
    canvas.paste(resized, (x, y), resized)
    return canvas


def main() -> int:
    if not SRC.is_file():
        print(f"Missing source logo: {SRC}", file=sys.stderr)
        print("Set PRICE_TRACKER_ROOT or clone price_tracker next to pricewatcha-api.", file=sys.stderr)
        return 1

    im = Image.open(SRC).convert("RGBA")
    mark = bleach_beta_badge_corner(im.crop(MARK_CROP_BOX))
    master = fit_in_square(mark, 512)

    def resize(size: tuple[int, int]) -> Image.Image:
        return master.resize(size, Image.Resampling.LANCZOS)

    icon_64 = resize((64, 64))
    icon_48 = resize((48, 48))
    icon_32 = resize((32, 32))
    icon_16 = resize((16, 16))
    icon_256 = resize((256, 256))

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    # BMP frames — Safari/Google reject PNG-compressed ICO entries.
    icon_64.save(
        OUT_DIR / "favicon.ico",
        format="ICO",
        sizes=[(64, 64), (48, 48), (32, 32), (16, 16)],
        append_images=[icon_48, icon_32, icon_16],
        bitmap_format="bmp",
    )
    icon_64.save(OUT_DIR / "favicon-64.png", format="PNG")
    icon_256.save(OUT_DIR / "favicon-256.png", format="PNG")

    print(f"Source: {SRC}")
    print(f"Wrote {OUT_DIR / 'favicon.ico'}")
    print(f"Wrote {OUT_DIR / 'favicon-64.png'}")
    print(f"Wrote {OUT_DIR / 'favicon-256.png'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
