"""Lossless rectangular details of the original, unmodified LOC-44 app captures."""
import hashlib
import json
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[2] / 'packages/web/public/images/product'
records = []
for locale in ('zh', 'en'):
    for scene, suffix, box in [
        ('landscape-replay', 'photo', (0, 70, 338, 500)),
        ('landscape-replay', 'controls', (440, 220, 830, 680)),
        ('export', 'preview', (79, 90, 469, 535)),
        ('export', 'save', (79, 552, 417, 615)),
        ('export', 'discard', (425, 552, 765, 615)),
    ]:
        source = root / f'{locale}-mobile-{scene}.png'
        target = root / f'{locale}-detail-{scene}-{suffix}.png'
        with Image.open(source) as image:
            image.crop(box).save(target)
        records.append(dict(file=target.name, source=source.name, crop=list(box),
                            width=box[2]-box[0], height=box[3]-box[1],
                            sha256=hashlib.sha256(target.read_bytes()).hexdigest(),
                            source_sha256=hashlib.sha256(source.read_bytes()).hexdigest()))
Path('docs/loc-44-detail-assets.json').write_text(json.dumps(records, indent=2)+'\n', encoding='utf-8')
