#!/usr/bin/env bash
#
# 生成对抗/边界测试素材（幂等）。
#
# 之前这些素材是临时手工造的，/tmp 被清掉后「对抗与边界」套件就被 SKIP，
# 而 run-all 仍然报「全部通过」—— 变成静默失效。改成脚本化生成。
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUT="${EDGE_DIR:-/tmp/locusify-edge}"
EXE="$ROOT/node_modules/.bin/exiftool"
SRC="$ROOT/packages/app/e2e/fixtures"

[[ -x "$EXE" ]] || { echo "✗ 找不到 exiftool: $EXE" >&2; exit 2; }
[[ -d "$SRC" ]] || { echo "✗ 找不到基准图: $SRC" >&2; exit 2; }

mkdir -p "$OUT/many"

# 1) 无 GPS 的图：复制后清掉全部 GPS 标签
cp "$SRC/01-tiananmen.jpg" "$OUT/no-gps.jpg"
"$EXE" -overwrite_original -gps:all= -XMP:all= "$OUT/no-gps.jpg" >/dev/null 2>&1
left=$("$EXE" -s -GPS:all "$OUT/no-gps.jpg" 2>/dev/null | wc -l | tr -d ' ')
[[ "$left" == "0" ]] || { echo "✗ no-gps.jpg 仍有 $left 个 GPS 标签" >&2; exit 1; }

# 2) 非图片文件
printf 'this is not an image\n' > "$OUT/not-an-image.txt"

# 3) 30 张带 GPS 的图，坐标与时间错开
python3 - "$SRC/01-tiananmen.jpg" "$EXE" "$OUT/many" <<'PY'
import os, shutil, subprocess, sys
src, exe, out = sys.argv[1], sys.argv[2], sys.argv[3]
for i in range(30):
    dst = os.path.join(out, f'img-{i:02d}.jpg')
    shutil.copy(src, dst)
    subprocess.run([exe, '-overwrite_original',
                    f'-GPSLatitude={39.90 + i * 0.01:.4f}', '-GPSLatitudeRef=N',
                    f'-GPSLongitude={116.40 + i * 0.01:.4f}', '-GPSLongitudeRef=E',
                    f'-DateTimeOriginal=2025:05:01 {9 + i // 6:02d}:{(i % 6) * 10:02d}:00', dst],
                   capture_output=True, check=False)
PY

echo "✓ 素材已就绪: $OUT"
echo "  no-gps.jpg（无 GPS）/ not-an-image.txt（非图片）/ many/（$(ls "$OUT/many" | wc -l | tr -d ' ') 张带 GPS）"
