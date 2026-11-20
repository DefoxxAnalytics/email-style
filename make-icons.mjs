import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const YELLOW = [0xfd, 0xc0, 0x0f];
const BLACK = [0x23, 0x1f, 0x20];
const SIZES = [16, 32, 64, 80, 128];

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([len, typeAndData, crc]);
}

function insidePointyHexagon(x, y, size) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.46;
  const dx = Math.abs(x - cx);
  const dy = Math.abs(y - cy);
  const halfWidth = (Math.sqrt(3) / 2) * r;
  return dx <= halfWidth && dy <= r - dx / Math.sqrt(3);
}

function hexagonPng(size) {
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = [0];
    for (let x = 0; x < size; x++) {
      const [r, g, b] = insidePointyHexagon(x + 0.5, y + 0.5, size) ? YELLOW : BLACK;
      row.push(r, g, b, 255);
    }
    rows.push(Buffer.from(row));
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(Buffer.concat(rows))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync("site/assets", { recursive: true });
for (const size of SIZES) writeFileSync(`site/assets/icon-${size}.png`, hexagonPng(size));
console.log(`Wrote ${SIZES.length} icons to site/assets`);
