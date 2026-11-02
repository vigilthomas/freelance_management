// Generates PWA icons (PNG) for the Forge "F" mark without image dependencies.
// Usage: node scripts/gen-icons.mjs   → writes public/icons/*.png and public/favicon.svg
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const ACCENT = [0xff, 0x5a, 0x36];
const WHITE = [0xff, 0xff, 0xff];
// Glyph rectangles in a 64-unit box (same as Logo.tsx path).
const GLYPH = [
  [22, 16, 30, 48],
  [22, 16, 44, 24],
  [22, 30, 42, 38],
];

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (const b of buf) {
    c = (crc ^ b) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function png(size, { maskable }) {
  const SS = 4;
  const raw = Buffer.alloc(size * (size * 4 + 1));
  // Maskable: full-bleed background, glyph scaled into the 80% safe zone.
  const scale = maskable ? 0.72 : 1;
  const radius = maskable ? 0 : 18;
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      let bg = 0, fg = 0;
      for (let sy = 0; sy < SS; sy++)
        for (let sx = 0; sx < SS; sx++) {
          const u = ((x + (sx + 0.5) / SS) / size) * 64;
          const v = ((y + (sy + 0.5) / SS) / size) * 64;
          const cx = Math.max(radius - u, 0, u - (64 - radius));
          const cy = Math.max(radius - v, 0, v - (64 - radius));
          if (cx * cx + cy * cy > radius * radius) continue;
          bg++;
          const gu = (u - 32) / scale + 32, gv = (v - 32) / scale + 32;
          if (GLYPH.some(([x0, y0, x1, y1]) => gu >= x0 && gu < x1 && gv >= y0 && gv < y1)) fg++;
        }
      const n = SS * SS;
      const a = bg / n, f = bg ? fg / bg : 0;
      const o = y * (size * 4 + 1) + 1 + x * 4;
      for (let i = 0; i < 3; i++) raw[o + i] = Math.round(ACCENT[i] * (1 - f) + WHITE[i] * f);
      raw[o + 3] = Math.round(a * 255);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync('public/icons', { recursive: true });
writeFileSync('public/icons/icon-192.png', png(192, { maskable: false }));
writeFileSync('public/icons/icon-512.png', png(512, { maskable: false }));
writeFileSync('public/icons/maskable-512.png', png(512, { maskable: true }));
writeFileSync('public/icons/apple-touch-icon.png', png(180, { maskable: true }));
writeFileSync(
  'public/favicon.svg',
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="18" fill="#FF5A36"/><path d="M22 16h22v8H30v6h12v8H30v10h-8z" fill="#fff"/></svg>\n',
);
console.log('icons written');
