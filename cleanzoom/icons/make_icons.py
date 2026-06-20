#!/usr/bin/env python3
"""Generate CleanZoom PNG icons with no third-party deps.

Draws a magnifying glass (the universal "zoom" glyph) in white on a rounded
blue tile. Run from this directory:  python3 make_icons.py
"""
import struct, zlib, math, os

BG = (45, 108, 223, 255)      # CleanZoom blue
FG = (255, 255, 255, 255)     # glyph white
TRANSP = (0, 0, 0, 0)


def rounded_mask(x, y, n, radius):
    """True if pixel (x,y) is inside an n x n rounded square."""
    if radius <= 0:
        return True
    for cx, cy in ((radius, radius), (n - radius, radius),
                   (radius, n - radius), (n - radius, n - radius)):
        # only the four corner quadrants get rounded
        if ((x < radius and y < radius and (cx, cy) == (radius, radius)) or
            (x >= n - radius and y < radius and (cx, cy) == (n - radius, radius)) or
            (x < radius and y >= n - radius and (cx, cy) == (radius, n - radius)) or
            (x >= n - radius and y >= n - radius and (cx, cy) == (n - radius, n - radius))):
            if math.hypot(x + 0.5 - cx, y + 0.5 - cy) > radius:
                return False
    return True


def point_seg_dist(px, py, ax, ay, bx, by):
    """Distance from point P to segment AB."""
    dx, dy = bx - ax, by - ay
    if dx == 0 and dy == 0:
        return math.hypot(px - ax, py - ay)
    t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)
    t = max(0.0, min(1.0, t))
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy))


def build(n):
    radius = max(1, round(n * 0.22))
    # magnifying-glass geometry (ring sits upper-left, handle to lower-right)
    cx, cy = n * 0.42, n * 0.42
    ring_r = n * 0.24
    ring_w = max(1.0, n * 0.085)          # ring stroke half-width
    # handle from ring edge toward lower-right corner
    hstart = (cx + ring_r * 0.707, cy + ring_r * 0.707)
    hend = (n * 0.80, n * 0.80)
    handle_w = max(1.0, n * 0.075)

    rows = []
    for y in range(n):
        row = bytearray()
        for x in range(n):
            if not rounded_mask(x, y, n, radius):
                row += bytes(TRANSP)
                continue
            px, py = x + 0.5, y + 0.5
            d_ring = abs(math.hypot(px - cx, py - cy) - ring_r)
            d_handle = point_seg_dist(px, py, *hstart, *hend)
            if d_ring <= ring_w or d_handle <= handle_w:
                row += bytes(FG)
            else:
                row += bytes(BG)
        rows.append(bytes(row))
    return rows


def write_png(path, n):
    rows = build(n)
    raw = b"".join(b"\x00" + r for r in rows)   # filter byte 0 per scanline

    def chunk(tag, data):
        c = struct.pack(">I", len(data)) + tag + data
        return c + struct.pack(">I", zlib.crc32(tag + data) & 0xffffffff)

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", n, n, 8, 6, 0, 0, 0)  # 8-bit RGBA
    idat = zlib.compress(raw, 9)
    with open(path, "wb") as f:
        f.write(sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b""))
    print("wrote", path, f"({n}x{n})")


if __name__ == "__main__":
    here = os.path.dirname(os.path.abspath(__file__))
    for size in (16, 32, 48, 128):
        write_png(os.path.join(here, f"icon{size}.png"), size)
