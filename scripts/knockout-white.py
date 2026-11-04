"""Vuelve transparente el fondo blanco de escudos que vinieron sin canal alfa útil.
Hace flood-fill desde los bordes (no toca blancos interiores del escudo).
Uso: python scripts/knockout-white.py public/crests/lito.png [...]
"""
import sys
from collections import deque
from PIL import Image


def knockout(path: str, thresh: int = 232) -> None:
    im = Image.open(path).convert("RGBA")
    w, h = im.size
    px = im.load()
    # (el padding transparente del normalizado se atraviesa; solo se borra el blanco conectado al borde)
    seen = bytearray(w * h)
    q = deque()
    for x in range(w):
        q.append((x, 0)); q.append((x, h - 1))
    for y in range(h):
        q.append((0, y)); q.append((w - 1, y))
    removed = 0
    while q:
        x, y = q.popleft()
        if x < 0 or y < 0 or x >= w or y >= h or seen[y * w + x]:
            continue
        seen[y * w + x] = 1
        r, g, b, a = px[x, y]
        if a == 0:
            q.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
        elif r >= thresh and g >= thresh and b >= thresh:
            px[x, y] = (r, g, b, 0)
            removed += 1
            q.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    im.save(path)
    print(f"ok {path}: {removed} px transparentes")


for p in sys.argv[1:]:
    knockout(p)
