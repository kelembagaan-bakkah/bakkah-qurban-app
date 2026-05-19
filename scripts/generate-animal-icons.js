/**
 * Generate animal icon images for Sapi (Cow) and Kambing (Goat)
 * as simple silhouette-style PNGs.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(data) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      if (crc & 1) {
        crc = (crc >>> 1) ^ 0xEDB88320;
      } else {
        crc = crc >>> 1;
      }
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function writeUint32(buf, offset, value) {
  buf.writeUInt32BE(value, offset);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  writeUint32(length, 0, data.length);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const chunkCrc = Buffer.alloc(4);
  writeUint32(chunkCrc, 0, crc32(typeAndData));
  return Buffer.concat([length, typeAndData, chunkCrc]);
}

function createPNG(width, height, pixels) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrData = Buffer.alloc(13);
  writeUint32(ihdrData, 0, width);
  writeUint32(ihdrData, 4, height);
  ihdrData[8] = 8;   // bit depth
  ihdrData[9] = 6;   // color type (RGBA)
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdrChunk = createChunk('IHDR', ihdrData);

  const rawData = [];  
  for (let y = 0; y < height; y++) {
    rawData.push(0); // filter none
    for (let x = 0; x < width; x++) {
      const p = pixels[y * width + x];
      rawData.push(p[0], p[1], p[2], p[3]);
    }
  }
  const compressed = zlib.deflateSync(Buffer.from(rawData));
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));
  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function cowShape(size) {
  const pixels = new Array(size * size).fill().map(() => [0, 0, 0, 0]);
  const cx = size / 2;
  const cy = size / 2;
  const s = size / 48;

  function set(x, y, r, g, b, a) {
    const ix = Math.round(x);
    const iy = Math.round(y);
    if (ix >= 0 && ix < size && iy >= 0 && iy < size) {
      pixels[iy * size + ix] = [r, g, b, a];
    }
  }

  function fillEllipse(cx, cy, rx, ry, r, g, b) {
    for (let y = cy - ry; y <= cy + ry; y++) {
      for (let x = cx - rx; x <= cx + rx; x++) {
        if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) {
          set(x, y, r, g, b, 255);
        }
      }
    }
  }

  // Body
  fillEllipse(cx, cy + 2 * s, 14 * s, 9 * s, 11, 47, 102);

  // Head
  fillEllipse(cx + 10 * s, cy - 8 * s, 7 * s, 6 * s, 219, 68, 55);

  // Horns
  fillEllipse(cx + 7 * s, cy - 15 * s, 1.5 * s, 3 * s, 255, 255, 255);
  fillEllipse(cx + 13 * s, cy - 15 * s, 1.5 * s, 3 * s, 255, 255, 255);

  // Eye
  fillEllipse(cx + 12 * s, cy - 9 * s, 1.5 * s, 1.5 * s, 255, 255, 255);
  fillEllipse(cx + 12.5 * s, cy - 9 * s, 0.6 * s, 0.6 * s, 0, 0, 0);

  // Legs
  fillEllipse(cx - 8 * s, cy + 12 * s, 2.5 * s, 3.5 * s, 180, 150, 100);
  fillEllipse(cx - 3 * s, cy + 12 * s, 2.5 * s, 3.5 * s, 180, 150, 100);
  fillEllipse(cx + 3 * s, cy + 12 * s, 2.5 * s, 3.5 * s, 180, 150, 100);
  fillEllipse(cx + 8 * s, cy + 12 * s, 2.5 * s, 3.5 * s, 180, 150, 100);

  // Tail
  fillEllipse(cx - 14 * s, cy, 1.2 * s, 3 * s, 11, 47, 102);
  fillEllipse(cx - 15 * s, cy + 3 * s, 1.5 * s, 1.5 * s, 219, 68, 55);

  // Spots on body
  fillEllipse(cx - 4 * s, cy, 2.5 * s, 2.5 * s, 255, 255, 255);
  fillEllipse(cx + 4 * s, cy - 1 * s, 2 * s, 2 * s, 255, 255, 255);

  return pixels;
}

function goatShape(size) {
  const pixels = new Array(size * size).fill().map(() => [0, 0, 0, 0]);
  const cx = size / 2;
  const cy = size / 2;
  const s = size / 48;

  function set(x, y, r, g, b, a) {
    const ix = Math.round(x);
    const iy = Math.round(y);
    if (ix >= 0 && ix < size && iy >= 0 && iy < size) {
      pixels[iy * size + ix] = [r, g, b, a];
    }
  }

  function fillEllipse(cx, cy, rx, ry, r, g, b) {
    for (let y = cy - ry; y <= cy + ry; y++) {
      for (let x = cx - rx; x <= cx + rx; x++) {
        if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) {
          set(x, y, r, g, b, 255);
        }
      }
    }
  }

  // Body
  fillEllipse(cx, cy + 3 * s, 12 * s, 8 * s, 139, 115, 85);

  // Head
  fillEllipse(cx - 10 * s, cy - 6 * s, 5 * s, 5 * s, 180, 150, 100);

  // Horns (curved back)
  fillEllipse(cx - 7 * s, cy - 13 * s, 1.2 * s, 3.5 * s, 100, 80, 60);
  fillEllipse(cx - 13 * s, cy - 13 * s, 1.2 * s, 3.5 * s, 100, 80, 60);

  // Eye
  fillEllipse(cx - 8 * s, cy - 7 * s, 1.2 * s, 1.2 * s, 0, 0, 0);

  // Snout
  fillEllipse(cx - 12 * s, cy - 4 * s, 1.5 * s, 1 * s, 200, 170, 120);

  // Beard
  fillEllipse(cx - 10 * s, cy - 1 * s, 1.5 * s, 2.5 * s, 180, 150, 100);

  // Legs
  fillEllipse(cx - 6 * s, cy + 12 * s, 2 * s, 3 * s, 100, 80, 60);
  fillEllipse(cx - 2 * s, cy + 12 * s, 2 * s, 3 * s, 100, 80, 60);
  fillEllipse(cx + 2 * s, cy + 12 * s, 2 * s, 3 * s, 100, 80, 60);
  fillEllipse(cx + 6 * s, cy + 12 * s, 2 * s, 3 * s, 100, 80, 60);

  // Tail (small)
  fillEllipse(cx + 12 * s, cy + 1 * s, 1 * s, 2 * s, 139, 115, 85);

  // Ear
  fillEllipse(cx - 6 * s, cy - 9 * s, 2 * s, 1 * s, 160, 130, 90);
  fillEllipse(cx - 14 * s, cy - 9 * s, 2 * s, 1 * s, 160, 130, 90);

  return pixels;
}

function generateIcon(size, outputPath, shapeFn, name) {
  const pixels = shapeFn(size);
  const png = createPNG(size, size, pixels);
  fs.writeFileSync(outputPath, png);
  console.log(`  ✓ Created ${name} ${size}x${size}: ${outputPath}`);
}

const outDir = path.join(__dirname, '..', 'assets');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

console.log('Generating animal icons...');
generateIcon(54, path.join(outDir, 'ic-sapi.png'), cowShape, 'Sapi');
generateIcon(54, path.join(outDir, 'ic-kambing.png'), goatShape, 'Kambing');
console.log('Done!');