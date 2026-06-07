#!/usr/bin/env python3
"""
GhostLayer Icon Generator
Generates the tray icon set and desktop app icon from code.

Output:
  assets/ghostlayer/ghostlayer-icon-tray.ico
  assets/ghostlayer/ghostlayer-icon-tray-active.ico
  assets/ghostlayer/ghostlayer-icon-desktop.ico
  + source PNGs for inspection
"""

import math, io, os, struct
from PIL import Image, ImageDraw, ImageFilter

# ── Color palette ─────────────────────────────────────────────────────────────
GREEN       = (0, 255, 65)   # Matrix green  #00FF41
GREEN_DIM   = (0, 195, 48)   # Normal tray fill - slightly pulled back
GREEN_EYE   = (0,  20,  5)   # Very dark green for eye cutouts

OUT_DIR = os.path.join(os.path.dirname(__file__),
                       '..', 'assets', 'ghostlayer')

# ── Ghost silhouette mask ─────────────────────────────────────────────────────
def ghost_mask(size):
    """
    Draw a clean ghost silhouette into a grayscale (L) mask.
    Shape: rounded head (ellipse) + body + 3 scalloped bottom bumps + 2 eye holes.
    All proportions scale with `size`.
    """
    img = Image.new('L', (size, size), 0)
    draw = ImageDraw.Draw(img)

    # --- layout ----------------------------------------------------------
    pad   = max(1, size // 12)
    L, T  = pad,        pad
    R, B  = size - pad, size - pad
    W     = R - L
    H     = B - T
    cx    = L + W / 2

    # Head: ellipse that covers the top 58 % of the ghost height
    HEAD_H_FRAC = 0.58
    head_bot    = T + H * HEAD_H_FRAC
    draw.ellipse([L, T, R, head_bot], fill=255)

    # Body top = vertical centre of the head ellipse
    body_top = T + (head_bot - T) / 2

    # --- scalloped bottom body polygon -----------------------------------
    scallop_count = 3
    scallop_h     = H * 0.22          # depth of each upward notch
    scallop_w     = W / scallop_count
    n_arc         = max(6, size // 6) # polygon resolution per scallop

    pts = [(L, body_top), (R, body_top), (R, B)]

    for sc in range(scallop_count - 1, -1, -1):   # right to left
        sx_r  = L + (sc + 1) * scallop_w
        sx_l  = L + sc       * scallop_w
        sx_m  = (sx_l + sx_r) / 2
        r_sc  = scallop_w / 2

        for j in range(n_arc + 1):
            t = math.pi * j / n_arc          # 0 to pi
            x = sx_m  - r_sc  * math.cos(t)  # left-to-right sweep
            y = B     - scallop_h * math.sin(t)
            pts.append((x, y))

    pts.append((L, B))
    draw.polygon(pts, fill=255)

    # --- eyes (narrow oval cutouts) --------------------------------------
    eye_top  = T + H * 0.17
    eye_bot  = T + H * 0.34          # slightly taller than before
    eye_hw   = max(1, W * 0.085)     # half-width  (narrower: was 0.13)

    for eye_cx_frac in (0.33, 0.67):
        ecx = L + W * eye_cx_frac
        draw.ellipse([ecx - eye_hw, eye_top,
                      ecx + eye_hw, eye_bot], fill=0)

    return img


# ── Glow helper ───────────────────────────────────────────────────────────────
def make_glow(mask, radius, rgb, alpha_scale):
    """Blur the mask and recolour it as a glow RGBA layer.
    alpha_scale: 0.0-1.0 multiplier on each blurred pixel (0-255 range).
    """
    size = mask.width
    blurred = mask.filter(ImageFilter.GaussianBlur(radius))
    out  = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    data = [(rgb[0], rgb[1], rgb[2], min(255, int(p * alpha_scale)))
            for p in blurred.getdata()]
    out.putdata(data)
    return out


def mask_to_rgba(mask, rgb, alpha_scale):
    """Convert a mask to a flat-colour RGBA layer.
    alpha_scale: 0.0-1.0 multiplier on each mask pixel (0-255 range).
    """
    size = mask.width
    out  = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    data = [(rgb[0], rgb[1], rgb[2], min(255, int(p * alpha_scale)))
            for p in mask.getdata()]
    out.putdata(data)
    return out


# ── Ring helper (active state) ────────────────────────────────────────────────
def draw_ring(canvas, size, rgb, alpha, thickness_frac=0.055, pad_frac=0.06):
    """Draw a ring around the icon area.
    Enforces a minimum 2px thickness and minimum 2px inset so it is always
    legible — even at 16x16 there will be a 1-2px visible border.
    """
    draw  = ImageDraw.Draw(canvas)
    thick = max(2, int(size * thickness_frac))
    pad   = max(2, int(size * pad_frac))
    draw.ellipse([pad, pad, size - pad, size - pad],
                 outline=rgb + (alpha,), width=thick)


# ── Glitch slices (desktop only) ─────────────────────────────────────────────
def add_glitch(canvas, size):
    """
    Add 2-3 subtle horizontal offset slices for the digital-ghost feel.
    Only used on desktop icon at larger sizes.
    """
    shift  = max(2, size // 28)
    slices = [
        (int(size * 0.24), int(size * 0.27), +shift),
        (int(size * 0.42), int(size * 0.44), -shift),
        (int(size * 0.61), int(size * 0.63), +shift),
    ]
    for y0, y1, dx in slices:
        if y1 <= y0:
            continue
        region = canvas.crop((0, y0, size, y1))
        # Paste shifted - clip to canvas bounds
        paste_x = max(0, min(size - (size), dx))
        canvas.paste(region, (dx, y0))


# ── Render one icon ───────────────────────────────────────────────────────────
def render(size, *, variant='normal', icon_type='tray'):
    """
    Produce a single RGBA icon image.

    variant:   'normal' | 'active'
    icon_type: 'tray'   | 'desktop'
    """
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    mask   = ghost_mask(size)

    # ── glow parameters ──────────────────────────────────────────────────
    if variant == 'active':
        outer_glow_r  = max(2.5, size * 0.13)
        outer_glow_a  = 0.75
        inner_glow_r  = max(1.5, size * 0.05)
        inner_glow_a  = 0.90
        fill_rgb      = GREEN
        fill_a        = 1.00
    elif icon_type == 'desktop':
        outer_glow_r  = max(2.5, size * 0.09)
        outer_glow_a  = 0.60
        inner_glow_r  = max(1.5, size * 0.04)
        inner_glow_a  = 0.70
        fill_rgb      = GREEN
        fill_a        = 0.96
    else:   # normal tray
        outer_glow_r  = max(1.5, size * 0.07)
        outer_glow_a  = 0.45
        inner_glow_r  = 0
        inner_glow_a  = 0
        fill_rgb      = GREEN_DIM
        fill_a        = 0.90

    # ── outer glow ───────────────────────────────────────────────────────
    canvas = Image.alpha_composite(
        canvas, make_glow(mask, outer_glow_r, GREEN, outer_glow_a))

    # ── inner (tighter) glow for active / desktop ────────────────────────
    if inner_glow_r > 0:
        canvas = Image.alpha_composite(
            canvas, make_glow(mask, inner_glow_r, GREEN, inner_glow_a))

    # ── ghost body fill ───────────────────────────────────────────────────
    canvas = Image.alpha_composite(
        canvas, mask_to_rgba(mask, fill_rgb, fill_a))

    # ── active ring ───────────────────────────────────────────────────────
    # Use a near-white highlight so the ring is visible against the green fill.
    RING_COLOR = (200, 255, 210)   # pale green-white — pops on #00FF41
    if variant == 'active':
        draw_ring(canvas, size, RING_COLOR, alpha=230,
                  thickness_frac=0.07, pad_frac=0.055)

    # ── desktop extras ────────────────────────────────────────────────────
    if icon_type == 'desktop':
        # Outer ring - very subtle
        draw_ring(canvas, size, GREEN, alpha=50,
                  thickness_frac=0.025, pad_frac=0.02)
        # Glitch slices at sizes where they're actually visible
        if size >= 48:
            add_glitch(canvas, size)

    return canvas


# ── ICO packager ──────────────────────────────────────────────────────────────
def save_ico(images, path):
    """
    Pack a dict of {size: RGBA Image} into a Windows ICO file using PNG frames.
    """
    sizes = sorted(images)
    header = struct.pack('<HHH', 0, 1, len(sizes))

    dir_entries  = []
    png_blobs    = []
    data_offset  = 6 + 16 * len(sizes)

    for s in sizes:
        img = images[s].convert('RGBA')
        buf = io.BytesIO()
        img.save(buf, 'PNG')
        blob = buf.getvalue()

        w = 0 if s == 256 else s   # ICO uses 0 to mean 256
        h = 0 if s == 256 else s
        dir_entries.append(
            struct.pack('<BBBBHHII', w, h, 0, 0, 1, 32, len(blob), data_offset))
        png_blobs.append(blob)
        data_offset += len(blob)

    with open(path, 'wb') as f:
        f.write(header)
        for e in dir_entries:
            f.write(e)
        for b in png_blobs:
            f.write(b)

    kb = os.path.getsize(path) / 1024
    print(f'  [ico] {os.path.basename(path)}  ({kb:.1f} KB)')


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    print(f'Output: {os.path.abspath(OUT_DIR)}\n')

    # ── Tray icons ────────────────────────────────────────────────────────
    TRAY_SIZES    = [16, 24, 32]
    DESKTOP_SIZES = [32, 48, 64, 128, 256]

    for variant, ico_name in (('normal', 'ghostlayer-icon-tray.ico'),
                               ('active', 'ghostlayer-icon-tray-active.ico')):
        print(f'Tray icon - {variant}:')
        imgs = {}
        for s in TRAY_SIZES:
            img  = render(s, variant=variant, icon_type='tray')
            imgs[s] = img
            png_path = os.path.join(OUT_DIR, f'ghostlayer-icon-tray-{s}{"a" if variant=="active" else ""}.png')
            img.save(png_path, 'PNG')
            print(f'  [png] {s}x{s}  {os.path.basename(png_path)}')
        save_ico(imgs, os.path.join(OUT_DIR, ico_name))
        print()

    # ── Desktop icon ──────────────────────────────────────────────────────
    print('Desktop icon:')
    imgs = {}
    for s in DESKTOP_SIZES:
        img = render(s, variant='normal', icon_type='desktop')
        imgs[s] = img
        png_path = os.path.join(OUT_DIR, f'ghostlayer-icon-desktop-{s}.png')
        img.save(png_path, 'PNG')
        print(f'  [png] {s}x{s}  {os.path.basename(png_path)}')
    save_ico(imgs, os.path.join(OUT_DIR, 'ghostlayer-icon-desktop.ico'))
    print()

    print('Done.')


if __name__ == '__main__':
    main()
