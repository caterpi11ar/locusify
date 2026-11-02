"""Resize the approved LOC-52 artwork without cropping, recoloring or redrawing.

Run with Python + Pillow: python scripts/generate-brand-assets.py
The backend favicon is owned by the backend change and is intentionally excluded.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'docs/brand/logo-source.png'


def main():
    with Image.open(SOURCE) as source:
        assert source.size == (1254, 1254)
        outputs = {
            'packages/app/src/assets/locusify.png': 256,
            'packages/app/public/logo.png': 256,
            'packages/web/public/logo.png': 256,
            'packages/web/public/favicon-16.png': 16,
            'packages/web/public/icon-light-32x32.png': 32,
            'packages/web/public/favicon-48.png': 48,
            'packages/web/public/apple-icon.png': 180,
        }
        for path, size in outputs.items():
            source.resize((size, size), Image.Resampling.LANCZOS).save(ROOT / path)
        source.save(ROOT / 'packages/app/public/favicon.ico', sizes=[(16, 16)])
        # Keep the existing 1200x630 social format and center the complete square.
        social = Image.new('RGB', (1200, 630), source.convert('RGB').getpixel((0, 0)))
        social.paste(source.resize((630, 630), Image.Resampling.LANCZOS), (285, 0))
        social.save(ROOT / 'packages/app/public/og-image.png')


if __name__ == '__main__':
    main()
