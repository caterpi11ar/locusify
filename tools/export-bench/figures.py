"""Turn the raw bench artifacts into the report's numbers and 效果图.

Usage:  python figures.py           (reads ./artifacts, writes ../../reports/export-bench)

Everything here is derived from PNGs on disk, so the report can be reproduced
without re-running the browser bench.
"""

from __future__ import annotations

import json
import shutil
from pathlib import Path

import numpy as np
from numpy.lib.stride_tricks import sliding_window_view
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).parent
ART = HERE / "artifacts"
OUT = HERE.parent.parent / "reports" / "export-bench"
SAMPLES = ["0.00", "2.60", "5.10", "8.30"]
LABELS = ["webcodecs (H.264)", "ffmpeg.wasm (x264)", "recorder (VP8/WebM)"]

FONT = ImageFont.load_default()


def load(name: str) -> np.ndarray:
    return np.asarray(Image.open(ART / name).convert("RGB")).astype(np.float64)


def psnr(a: np.ndarray, b: np.ndarray) -> float:
    mse = ((a - b) ** 2).mean()
    return 99.0 if mse == 0 else float(10 * np.log10(255**2 / mse))


def ssim(a: np.ndarray, b: np.ndarray, win: int = 8) -> float:
    """8x8-window mean/variance SSIM on luma (skimage is not available here)."""
    ga, gb = a.mean(axis=2), b.mean(axis=2)
    wa = sliding_window_view(ga, (win, win)).mean(axis=(-1, -2))
    wb = sliding_window_view(gb, (win, win)).mean(axis=(-1, -2))
    c1, c2 = (0.01 * 255) ** 2, (0.03 * 255) ** 2
    ma, mb = wa.mean(), wb.mean()
    va, vb = wa.var(), wb.var()
    cov = ((wa - ma) * (wb - mb)).mean()
    return float(((2 * ma * mb + c1) * (2 * cov + c2)) / ((ma**2 + mb**2 + c1) * (va + vb + c2)))


def compare(a: np.ndarray, b: np.ndarray) -> dict:
    diff = np.abs(a - b).mean(axis=2)
    return {
        "psnr": round(psnr(a, b), 2),
        "ssim": round(ssim(a, b), 4),
        "meanAbsDiff": round(float(diff.mean()), 2),
        "pctPixelsOver40": round(float(100 * (diff > 40).mean()), 2),
    }


def label(img: Image.Image, text: str, pad: int = 26) -> Image.Image:
    out = Image.new("RGB", (img.width, img.height + pad), (16, 18, 22))
    out.paste(img, (0, pad))
    ImageDraw.Draw(out).text((8, 7), text, fill=(220, 226, 236), font=FONT)
    return out


def strip(images: list[tuple[str, Image.Image]], gap: int = 10) -> Image.Image:
    labelled = [label(img, txt) for txt, img in images]
    w = max(i.width for i in labelled)
    h = sum(i.height for i in labelled) + gap * (len(labelled) - 1)
    out = Image.new("RGB", (w, h), (16, 18, 22))
    y = 0
    for i in labelled:
        out.paste(i, (0, y))
        y += i.height + gap
    return out


def row(images: list[tuple[str, Image.Image]], gap: int = 10) -> Image.Image:
    labelled = [label(img, txt) for txt, img in images]
    w = sum(i.width for i in labelled) + gap * (len(labelled) - 1)
    h = max(i.height for i in labelled)
    out = Image.new("RGB", (w, h), (16, 18, 22))
    x = 0
    for i in labelled:
        out.paste(i, (x, 0))
        x += i.width + gap
    return out


def heat(a: np.ndarray, b: np.ndarray, gain: float = 3.0) -> Image.Image:
    d = np.clip(np.abs(a - b).mean(axis=2) * gain, 0, 255)
    rgb = np.stack([d, d * 0.35, 255 - d * 0.8], axis=-1).clip(0, 255).astype(np.uint8)
    return Image.fromarray(rgb)


def crop(png: str, box: tuple[int, int, int, int]) -> Image.Image:
    return Image.open(ART / png).convert("RGB").crop(box)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)

    # ── fidelity vs the live DOM ────────────────────────────────────────────
    fidelity = {}
    for t in SAMPLES:
        fidelity[t] = compare(load(f"ref-{t}.png"), load(f"composite-{t}.png"))
    codecs = {name: compare(load("composite-5.10.png"), load(f"decoded-{key}.png"))
              for name, key in zip(("webcodecs", "ffmpeg", "recorder"), ("webcodecs", "ffmpeg", "recorder"))}
    glass_lost = compare(load("composite-5.10.png"), load("composite-noglass-5.10.png"))

    metrics = json.loads((ART / "metrics.json").read_text(encoding="utf-8"))
    report = {
        "generatedAt": metrics.get("generatedAt"),
        "probe": metrics.get("probe"),
        "snapshots": metrics.get("snapshots"),
        "compose": metrics.get("compose"),
        "encoders": metrics.get("encoders"),
        "fidelity": fidelity,
        "decodedVsComposite": codecs,
        "glassVsNoGlass": glass_lost,
    }
    (OUT / "fidelity.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    shutil.copyfile(ART / "metrics.json", OUT / "metrics.json")
    print(json.dumps({"fidelity": fidelity, "decoded": codecs}, indent=2))

    # ── fig 1: live vs composite vs amplified diff ──────────────────────────
    ref, comp = load("ref-5.10.png"), load("composite-5.10.png")
    w = 1400
    panels = [
        ("replica scene, live render  (hand-built, NOT the real app)", Image.fromarray(ref.astype(np.uint8))),
        ("offline composite  (Canvas2D + html-to-image snapshots)", Image.fromarray(comp.astype(np.uint8))),
        ("abs diff x3  - red = divergence", heat(ref, comp)),
    ]
    img = strip([(t, p.resize((w, round(p.height * w / p.width)))) for t, p in panels])
    img.save(OUT / "fig-1-live-vs-composite.png")

    # ── fig 2: four timestamps, ref over composite ──────────────────────────
    tw = 660
    cols = []
    for t in SAMPLES:
        a = Image.fromarray(load(f"ref-{t}.png").astype(np.uint8))
        b = Image.fromarray(load(f"composite-{t}.png").astype(np.uint8))
        cols.append((f"t={t}s  live render", a.resize((tw, round(a.height * tw / a.width)))))
        cols.append((f"t={t}s  composite", b.resize((tw, round(b.height * tw / b.width)))))
    upper = row([cols[0], cols[2], cols[4], cols[6]])
    lower = row([cols[1], cols[3], cols[5], cols[7]])
    fig2 = strip([("replica scene, live render - 0.00 / 2.60 / 5.10 / 8.30 s", upper),
                  ("offline composite - same timestamps", lower)])
    fig2.save(OUT / "fig-2-timeline.png")

    # ── fig 3: glass (backdrop blur) vs no glass, 1:1 crop ──────────────────
    box = (1380, 40, 1860, 350)
    fig3 = row([("replica scene, live render", crop("ref-5.10.png", box)),
                ("composite, blurred map as glass", crop("composite-5.10.png", box)),
                ("composite, glass skipped", crop("composite-noglass-5.10.png", box))])
    fig3.save(OUT / "fig-3-glass.png")

    # ── fig 4: codec round-trip, 1:1 crop of the stats card ─────────────────
    box2 = (1400, 40, 1860, 350)
    fig4 = row([("composite source frame", crop("composite-5.10.png", box2))]
               + [(f"{n} decoded", crop(f"decoded-{k}.png", box2))
                  for n, k in (("webcodecs H.264", "webcodecs"), ("ffmpeg x264", "ffmpeg"), ("MediaRecorder", "recorder"))])
    fig4.save(OUT / "fig-4-codec-roundtrip.png")
    print("figures:", sorted(p.name for p in OUT.glob("fig-*.png")))


if __name__ == "__main__":
    main()
