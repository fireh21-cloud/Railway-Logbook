"""Generate simple PNG app icons without any external dependencies (no Pillow).
Draws a maroon rounded-square background with a simple white locomotive glyph.
"""
import struct
import zlib
import os

BG = (123, 30, 20)      # maroon, loosely matching Indian Railways branding
FG = (250, 240, 225)    # off-white


def rounded_square_mask(size, radius):
    mask = [[True] * size for _ in range(size)]
    for y in range(size):
        for x in range(size):
            if x < radius and y < radius:
                cx, cy = radius, radius
            elif x >= size - radius and y < radius:
                cx, cy = size - radius - 1, radius
            elif x < radius and y >= size - radius:
                cx, cy = radius, size - radius - 1
            elif x >= size - radius and y >= size - radius:
                cx, cy = size - radius - 1, size - radius - 1
            else:
                continue  # not in any corner box, always inside
            if (x - cx) ** 2 + (y - cy) ** 2 > radius ** 2:
                mask[y][x] = False
    return mask


def draw_locomotive(pixels, size):
    # body: horizontal bar
    body_top = int(size * 0.42)
    body_bottom = int(size * 0.66)
    body_left = int(size * 0.16)
    body_right = int(size * 0.84)
    for y in range(body_top, body_bottom):
        for x in range(body_left, body_right):
            pixels[y][x] = FG
    # cab: raised block on the left third
    cab_top = int(size * 0.28)
    cab_left = int(size * 0.16)
    cab_right = int(size * 0.42)
    for y in range(cab_top, body_top):
        for x in range(cab_left, cab_right):
            pixels[y][x] = FG
    # two wheels
    wheel_r = int(size * 0.07)
    for cx in (int(size * 0.30), int(size * 0.66)):
        cy = body_bottom + wheel_r - 2
        for y in range(cy - wheel_r, cy + wheel_r):
            for x in range(cx - wheel_r, cx + wheel_r):
                if 0 <= x < size and 0 <= y < size and (x - cx) ** 2 + (y - cy) ** 2 <= wheel_r ** 2:
                    pixels[y][x] = BG
    # smokestack
    stack_w = int(size * 0.05)
    stack_top = int(size * 0.18)
    cx = int(size * 0.24)
    for y in range(stack_top, cab_top):
        for x in range(cx - stack_w, cx + stack_w):
            pixels[y][x] = FG


def make_icon(size):
    radius = int(size * 0.18)
    mask = rounded_square_mask(size, radius)
    pixels = [[BG if mask[y][x] else (0, 0, 0, 0) for x in range(size)] for y in range(size)]
    draw_locomotive(pixels, size)
    return pixels, mask


def write_png(path, pixels, mask, size):
    def chunk(tag, data):
        return (struct.pack(">I", len(data)) + tag + data +
                struct.pack(">I", zlib.crc32(tag + data) & 0xffffffff))

    raw = bytearray()
    for y in range(size):
        raw.append(0)  # no filter
        for x in range(size):
            px = pixels[y][x]
            if mask[y][x]:
                r, g, b = px[0], px[1], px[2]
                a = 255
            else:
                r = g = b = a = 0
            raw += bytes((r, g, b, a))

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    idat = zlib.compress(bytes(raw), 9)
    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", ihdr)
    png += chunk(b"IDAT", idat)
    png += chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(png)


if __name__ == "__main__":
    out_dir = os.path.join(os.path.dirname(__file__), "..", "icons")
    os.makedirs(out_dir, exist_ok=True)
    for size, name in [(192, "icon-192.png"), (512, "icon-512.png"), (180, "apple-touch-icon.png"),
                        (32, "favicon-32.png")]:
        pixels, mask = make_icon(size)
        write_png(os.path.join(out_dir, name), pixels, mask, size)
        print(f"wrote {name}")
