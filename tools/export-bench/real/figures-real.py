"""Build the report figures for the REAL-app export benchmark.

Everything is derived from the PNGs the harness dumped into `shots/real/`, so a
re-run of the browser is not needed to regenerate the figures.

    python tools/export-bench/real/figures-real.py
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[3]
SRC = ROOT / "shots" / "real"
OUT = ROOT / "reports" / "export-bench"
OUT.mkdir(parents=True, exist_ok=True)

STATES = ["w0-early", "w1-mid", "w2-mid", "w3-mid", "w3-late"]
STATE_TITLES = {
    "w0-early": "第 1 段 15%",
    "w1-mid": "第 1 段 75%",
    "w2-mid": "第 2 段 50%",
    "w3-mid": "第 3 段 35%",
    "w3-late": "第 3 段 85%",
}

BG = (18, 20, 24)
FG = (235, 238, 242)
DIM = (150, 158, 168)
ACCENT = (255, 92, 92)


def load(name: str) -> np.ndarray:
    return np.asarray(Image.open(SRC / name).convert("RGB")).astype(np.float32)


def psnr(a: np.ndarray, b: np.ndarray) -> float:
    mse = float(((a - b) ** 2).mean())
    return 99.0 if mse == 0 else 10 * np.log10(255.0 ** 2 / mse)


def ssim(a: np.ndarray, b: np.ndarray, win: int = 8) -> float:
    c1, c2 = (0.01 * 255) ** 2, (0.03 * 255) ** 2
    ga, gb = a.mean(axis=2), b.mean(axis=2)
    h, w = ga.shape
    vals = []
    for y in range(0, h - win + 1, win):
        for x in range(0, w - win + 1, win):
            pa = ga[y:y + win, x:x + win]
            pb = gb[y:y + win, x:x + win]
            ma, mb = pa.mean(), pb.mean()
            va, vb = pa.var(), pb.var()
            cov = ((pa - ma) * (pb - mb)).mean()
            vals.append(((2 * ma * mb + c1) * (2 * cov + c2))
                        / ((ma * ma + mb * mb + c1) * (va + vb + c2)))
    return float(np.mean(vals))


def diff_image(a: np.ndarray, b: np.ndarray, gain: float = 3.0) -> np.ndarray:
    d = np.abs(a - b).mean(axis=2) * gain
    return np.clip(d, 0, 255).astype(np.uint8)


def label(img: Image.Image, text: str, height: int = 34, fill=FG) -> Image.Image:
    strip = Image.new("RGB", (img.width, height), BG)
    ImageDraw.Draw(strip).text((12, height // 2 - 6), text, fill=fill)
    out = Image.new("RGB", (img.width, img.height + height), BG)
    out.paste(strip, (0, 0))
    out.paste(img, (0, height))
    return out


def row(images: list[Image.Image], gap: int = 10, bg=BG) -> Image.Image:
    w = sum(i.width for i in images) + gap * (len(images) - 1)
    h = max(i.height for i in images)
    out = Image.new("RGB", (w, h), bg)
    x = 0
    for i in images:
        out.paste(i, (x, 0))
        x += i.width + gap
    return out


def stack(images: list[Image.Image], gap: int = 10, bg=BG) -> Image.Image:
    w = max(i.width for i in images)
    h = sum(i.height for i in images) + gap * (len(images) - 1)
    out = Image.new("RGB", (w, h), bg)
    y = 0
    for i in images:
        out.paste(i, (0, y))
        y += i.height + gap
    return out


def to_img(arr: np.ndarray) -> Image.Image:
    return Image.fromarray(arr.astype(np.uint8))


def clusters(a: np.ndarray, b: np.ndarray, block: int = 32, thresh: float = 12.0) -> list[dict]:
    """Coarse connected regions where the two frames differ."""
    d = np.abs(a - b).mean(axis=2)
    h, w = d.shape
    bh, bw = h // block, w // block
    grid = d[:bh * block, :bw * block].reshape(bh, block, bw, block).mean(axis=(1, 3))
    hot = grid > thresh
    seen = np.zeros_like(hot, dtype=bool)
    boxes = []
    for by in range(bh):
        for bx in range(bw):
            if not hot[by, bx] or seen[by, bx]:
                continue
            stack_ = [(by, bx)]
            seen[by, bx] = True
            cells = []
            while stack_:
                cy, cx = stack_.pop()
                cells.append((cy, cx))
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    ny, nx = cy + dy, cx + dx
                    if 0 <= ny < bh and 0 <= nx < bw and hot[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        stack_.append((ny, nx))
            ys = [c[0] for c in cells]
            xs = [c[1] for c in cells]
            y0, y1 = min(ys) * block, (max(ys) + 1) * block
            x0, x1 = min(xs) * block, (max(xs) + 1) * block
            if (y1 - y0) * (x1 - x0) < 2000:
                continue
            boxes.append({
                "x": int(x0), "y": int(y0), "w": int(x1 - x0), "h": int(y1 - y0),
                "maxDiff": round(float(d[y0:y1, x0:x1].max()), 1),
                "meanDiff": round(float(d[y0:y1, x0:x1].mean()), 1),
            })
    boxes.sort(key=lambda r: -r["meanDiff"])
    return boxes


# ---------------------------------------------------------------- fidelity
fidelity = []
for state in STATES:
    ref = load(f"ref-{state}.png")
    for variant in ("full", "split"):
        comp = load(f"{variant}-{state}.png")
        d = np.abs(comp - ref).mean(axis=2)
        fidelity.append({
            "state": state,
            "variant": variant,
            "psnr": round(psnr(comp, ref), 2),
            "ssim": round(ssim(comp, ref), 4),
            "meanAbsDiff": round(float(d.mean()), 2),
            "pctOver40": round(float(100 * (d > 40).mean()), 2),
        })

enc = load("clip-frame45.png")
dec = load("decoded-clip.png")
d = np.abs(dec - enc).mean(axis=2)
fidelity.append({
    "state": "clip-frame-45",
    "variant": "decoded-mp4-vs-encoded-composite",
    "psnr": round(psnr(dec, enc), 2),
    "ssim": round(ssim(dec, enc), 4),
    "meanAbsDiff": round(float(d.mean()), 2),
    "pctOver40": round(float(100 * (d > 40).mean()), 2),
})

ref = load("ref-w2-mid.png")
comp = load("split-w2-mid.png")
cluster_rows = clusters(ref, comp)
fidelity_json = {"rows": fidelity, "worstCaseClusters": cluster_rows}
(OUT / "fidelity-real.json").write_text(json.dumps(fidelity_json, indent=2), encoding="utf-8")

# ---------------------------------------------------------------- fig 1
ref = load("ref-w1-mid.png")
comp = load("split-w1-mid.png")
full = load("full-w1-mid.png")
d_split, d_full = psnr(comp, ref), psnr(full, ref)
fig1 = row([
    label(to_img(ref), f"真实 app 实时渲染  (Playwright 截图, {ref.shape[1]}x{ref.shape[0]})"),
    label(to_img(comp), f"离线合成 split  PSNR {d_split:.2f} dB"),
    label(to_img(np.stack([diff_image(ref, comp)] * 3, axis=2)), "差异 x3 (split vs 实时)", fill=ACCENT),
])
if fig1.width > 1680:
    fig1 = fig1.resize((1680, int(1680 * fig1.height / fig1.width)), Image.LANCZOS)
fig1.save(OUT / "fig-1-real-vs-composite.png")

# ---------------------------------------------------------------- fig 2
PANEL_W = 640
panels_top, panels_bottom = [], []
for state in STATES:
    ref = load(f"ref-{state}.png")
    comp = load(f"split-{state}.png")
    h = int(PANEL_W * ref.shape[0] / ref.shape[1])

    def shrink(a: np.ndarray) -> Image.Image:
        return Image.fromarray(a.astype(np.uint8)).resize((PANEL_W, h), Image.LANCZOS)

    panels_top.append(label(shrink(ref), f"{STATE_TITLES[state]} · 实时渲染"))
    panels_bottom.append(label(shrink(comp), f"{STATE_TITLES[state]} · 离线合成 {psnr(comp, ref):.1f} dB", fill=DIM))
fig2 = stack([row(panels_top), row(panels_bottom)])
if fig2.width > 1680:
    fig2 = fig2.resize((1680, int(1680 * fig2.height / fig2.width)), Image.LANCZOS)
fig2.save(OUT / "fig-2-real-states.png")

# ---------------------------------------------------------------- fig 3
crops = []
for c in cluster_rows[:2]:
    pad = 24
    x0 = max(0, c["x"] - pad)
    y0 = max(0, c["y"] - pad)
    x1 = min(ref.shape[1], c["x"] + c["w"] + pad)
    y1 = min(ref.shape[0], c["y"] + c["h"] + pad)
    crops.append((x0, y0, x1, y1, c))

fig3_parts = []
for x0, y0, x1, y1, c in crops:
    a = to_img(ref[y0:y1, x0:x1])
    b = to_img(comp[y0:y1, x0:x1])
    dd = to_img(np.stack([diff_image(ref[y0:y1, x0:x1], comp[y0:y1, x0:x1])] * 3, axis=2))
    zoom = 2
    a = a.resize((a.width * zoom, a.height * zoom), Image.NEAREST)
    b = b.resize((b.width * zoom, b.height * zoom), Image.NEAREST)
    dd = dd.resize((dd.width * zoom, dd.height * zoom), Image.NEAREST)
    title = f"({x0},{y0})-({x1},{y1})  mean diff {c['meanDiff']}"
    fig3_parts.append(row([
        label(a, f"{title} · 实时"),
        label(b, "· 合成"),
        label(dd, "· 差异 x3", fill=ACCENT),
    ]))
fig3 = stack(fig3_parts)
if fig3.width > 1600:
    fig3 = fig3.resize((1600, int(1600 * fig3.height / fig3.width)), Image.LANCZOS)
fig3.save(OUT / "fig-3-real-residual.png")

# ---------------------------------------------------------------- fig 4
metrics = json.loads((SRC / "metrics.json").read_text(encoding="utf-8"))
full_ms = [s["full"]["totalMs"] for s in metrics["states"]]
split_ms = [s["split"]["totalMs"] for s in metrics["states"]]
static_ms = [s["staticMs"] for s in metrics["states"]]

CHART_W, CHART_H = 1180, 420
chart = Image.new("RGB", (CHART_W, CHART_H), BG)
draw = ImageDraw.Draw(chart)
top, bottom, left = 30, CHART_H - 46, 88
maxv = 320.0


def y_of(v: float) -> int:
    return int(bottom - (v / maxv) * (bottom - top))


# budget line: 1000/30
budget = 1000 / 30
draw.line([(left, y_of(budget)), (CHART_W - 24, y_of(budget))], fill=(90, 200, 140), width=1)
draw.text((CHART_W - 250, y_of(budget) - 14), "30fps 预算 33.3 ms", fill=(90, 200, 140))
for v in (0, 50, 100, 150, 200, 250, 300):
    draw.line([(left - 6, y_of(v)), (left, y_of(v))], fill=DIM)
    draw.text((12, y_of(v) - 6), f"{v}", fill=DIM)
draw.line([(left, top), (left, bottom)], fill=DIM)

slot = (CHART_W - left - 40) / (len(STATES) * 2 + 1)
for i, state in enumerate(STATES):
    for j, (vals, colour, name) in enumerate((
        (full_ms, (255, 132, 92), "整帧光栅"),
        (split_ms, (92, 168, 255), "分层合成"),
    )):
        v = vals[i]
        x = left + 20 + (i * 2 + j) * slot
        draw.rectangle([x, y_of(v), x + slot * 0.66, bottom], fill=colour)
        draw.text((x - 2, y_of(v) - 14), f"{v:.0f}", fill=FG)
    draw.text((left + 20 + i * 2 * slot, bottom + 8), STATE_TITLES[state], fill=DIM)

legend_y = bottom + 28
draw.rectangle([left + 20, legend_y, left + 32, legend_y + 10], fill=(255, 132, 92))
draw.text((left + 38, legend_y - 2), "整帧光栅 / 帧", fill=FG)
draw.rectangle([left + 190, legend_y, left + 202, legend_y + 10], fill=(92, 168, 255))
draw.text((left + 208, legend_y - 2), "分层合成 / 帧", fill=FG)
draw.text((left + 360, legend_y - 2),
          f"静态层只做一次: {min(static_ms):.0f}-{max(static_ms):.0f} ms", fill=DIM)
chart = label(chart, "每帧成本 (1920x1080, 真实 app 的 16:9 抓取框)", height=36)
chart.save(OUT / "fig-4-real-cost.png")

for f in sorted(OUT.glob("fig-*-real*.png")):
    print(f.name, f.stat().st_size // 1024, "KB", Image.open(f).size)
print(json.dumps(fidelity_json["worstCaseClusters"][:4], indent=1))
