#!/usr/bin/env python3
"""Crop the Glenfinnan photo to a half-body portrait for the hero.

    python3 .claude/crop-portrait.py ~/Downloads/your-photo.jpg

Writes assets/portrait.jpg — a 4:5 crop from just above the head down to the
hands, centred on the subject.

The crop box is expressed as fractions of the source rather than pixels, so it
lands in the same place whether you hand it the phone-sized copy or the
full-resolution original.
"""
import sys, os
from PIL import Image, ImageOps

# left, top, right, bottom — as fractions of the source image.
BOX = (0.311, 0.206, 0.962, 0.750)
OUT_WIDTH = 1000          # plenty for a 2x display at the size it renders
TARGET_RATIO = 4 / 5      # width / height


def main():
    if len(sys.argv) < 2:
        sys.exit("usage: crop-portrait.py <source-image> [output]")

    src = os.path.expanduser(sys.argv[1])
    here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    dst = os.path.expanduser(sys.argv[2]) if len(sys.argv) > 2 \
        else os.path.join(here, "assets", "portrait.jpg")

    img = Image.open(src)
    img = ImageOps.exif_transpose(img)        # honour the camera's rotation flag
    w, h = img.size

    left, top, right, bottom = (
        round(BOX[0] * w), round(BOX[1] * h),
        round(BOX[2] * w), round(BOX[3] * h),
    )

    # Force exactly 4:5 by growing the short axis, clamped to the image edges.
    cw, ch = right - left, bottom - top
    if cw / ch > TARGET_RATIO:
        want = round(cw / TARGET_RATIO)
        grow = want - ch
        top = max(0, top - grow // 2)
        bottom = min(h, top + want)
    else:
        want = round(ch * TARGET_RATIO)
        grow = want - cw
        left = max(0, left - grow // 2)
        right = min(w, left + want)

    out = img.crop((left, top, right, bottom))
    out = out.resize((OUT_WIDTH, round(OUT_WIDTH / TARGET_RATIO)), Image.LANCZOS)
    if out.mode != "RGB":
        out = out.convert("RGB")

    os.makedirs(os.path.dirname(dst), exist_ok=True)
    out.save(dst, "JPEG", quality=88, optimize=True, progressive=True)
    print(f"source {w}x{h} -> crop ({left},{top},{right},{bottom}) -> {out.size[0]}x{out.size[1]}")
    print(f"written {dst} ({os.path.getsize(dst) // 1024} KB)")


if __name__ == "__main__":
    main()
