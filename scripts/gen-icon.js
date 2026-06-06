/**
 * gen-icon.js — generates assets/icon.ico for GhostLayer
 *
 * Pure Node.js, no extra dependencies.
 * Produces a 32×32 ICO (single size) using the BMP DIB format.
 *
 * Design: flat hexagon (⬡ matches the UI empty-state icon) in accent blue
 * on GhostLayer's dark background.
 *
 * Run: node scripts/gen-icon.js
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ── Palette (matches index.css variables) ────────────────────────────────────
const BG     = { r: 0x0f, g: 0x11, b: 0x17 };  // --bg
const ACCENT = { r: 0x5b, g: 0x8d, b: 0xef };  // --accent
const RING   = { r: 0x7a, g: 0xa3, b: 0xf5 };  // --accent-hover (bright ring)

// ── Canvas ───────────────────────────────────────────────────────────────────
// electron-builder requires ≥ 256×256 for Windows ICO
const W = 256, H = 256;
// BGRA buffer, stored bottom-up (BMP row order)
const buf = Buffer.alloc(W * H * 4, 0);

function setPixel(x, y, r, g, b, a = 255) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const ry = H - 1 - y;   // BMP bottom-up
  const i  = (ry * W + x) * 4;
  buf[i]   = b;
  buf[i+1] = g;
  buf[i+2] = r;
  buf[i+3] = a;
}

// ── Fill background ──────────────────────────────────────────────────────────
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++)
    setPixel(x, y, BG.r, BG.g, BG.b);

// ── Hexagon helpers ───────────────────────────────────────────────────────────
const CX = 127.5, CY = 127.5;

/** Flat-top hexagon vertex at angle (degrees). */
function hexVert(angle, radius) {
  const rad = (angle * Math.PI) / 180;
  return { x: CX + radius * Math.cos(rad), y: CY + radius * Math.sin(rad) };
}

/** Is point (px,py) inside the flat-top hexagon of given radius? */
function inHex(px, py, radius) {
  const dx = Math.abs(px - CX), dy = Math.abs(py - CY);
  const h  = radius * Math.sin(Math.PI / 3);  // half-height
  if (dy > h) return false;
  if (dx > radius) return false;
  // slanted edge: dx/radius + dy/h <= 1
  return (dx / radius + dy / h) <= 1.0;
}

// Outer radius (fill) and inner radius (background cutout) for a thick ring
// Scaled for 256×256 (32×32 base × 8)
const R_OUTER = 105.6;
const R_INNER = 76.0;

// ── Fill outer hexagon with accent, inner with background ────────────────────
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    if (inHex(x + 0.5, y + 0.5, R_OUTER)) {
      if (inHex(x + 0.5, y + 0.5, R_INNER)) {
        // interior — keep background
      } else {
        setPixel(x, y, ACCENT.r, ACCENT.g, ACCENT.b);
      }
    }
  }
}

// ── Anti-alias the outer edge with the brighter ring colour ──────────────────
// Walk the outer perimeter at sub-pixel resolution
for (let deg = 0; deg < 360; deg += 0.1) {
  const v = hexVert(deg, R_OUTER - 1.0);
  setPixel(v.x, v.y, RING.r, RING.g, RING.b);
}

// ── Small dot in the centre ───────────────────────────────────────────────────
// Gives the hex a "node" feel — recognisable at small sizes (scaled for 256)
const DOT_R = 8;
for (let y = -DOT_R; y <= DOT_R; y++)
  for (let x = -DOT_R; x <= DOT_R; x++)
    if (x * x + y * y <= DOT_R * DOT_R)
      setPixel(CX + x, CY + y, ACCENT.r, ACCENT.g, ACCENT.b);

// ── Assemble ICO ─────────────────────────────────────────────────────────────

// AND mask: 1 bit per pixel, padded to DWORD rows (all 0 = opaque via alpha)
const andRowBytes = Math.ceil(W / 32) * 4;   // 4 bytes per row (1 DWORD)
const andMask     = Buffer.alloc(andRowBytes * H, 0);

// BITMAPINFOHEADER (40 bytes)
const dibHdr = Buffer.alloc(40, 0);
dibHdr.writeUInt32LE(40,      0);   // header size
dibHdr.writeInt32LE(W,        4);   // width
dibHdr.writeInt32LE(H * 2,    8);   // height × 2 (XOR + AND stacked)
dibHdr.writeUInt16LE(1,       12);  // planes
dibHdr.writeUInt16LE(32,      14);  // bpp
// rest zeroed (no compression, sizes auto-calculated)

const dibData = Buffer.concat([dibHdr, buf, andMask]);

// ICO file header
const icoHdr = Buffer.alloc(6);
icoHdr.writeUInt16LE(0, 0);   // reserved
icoHdr.writeUInt16LE(1, 2);   // type 1 = ICO
icoHdr.writeUInt16LE(1, 4);   // 1 image

// Image directory entry
const dirEntry = Buffer.alloc(16);
dirEntry.writeUInt8(W >= 256 ? 0 : W, 0);   // 0 = 256 in ICO spec
dirEntry.writeUInt8(H >= 256 ? 0 : H, 1);   // 0 = 256 in ICO spec
dirEntry.writeUInt8(0,              2);   // colour count (0 = TrueColor)
dirEntry.writeUInt8(0,              3);   // reserved
dirEntry.writeUInt16LE(1,           4);   // planes
dirEntry.writeUInt16LE(32,          6);   // bpp
dirEntry.writeUInt32LE(dibData.length, 8); // data size
dirEntry.writeUInt32LE(6 + 16,     12);   // data offset

const ico = Buffer.concat([icoHdr, dirEntry, dibData]);

// ── Write output ─────────────────────────────────────────────────────────────
const outDir  = path.join(__dirname, '..', 'assets');
const outFile = path.join(outDir, 'icon.ico');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, ico);
console.log(`✓ assets/icon.ico  (${ico.length} bytes, 256×256 ICO)`);
