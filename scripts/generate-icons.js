/**
 * Generate PWA icons (192x192 and 512x512) as valid PNG files
 * without requiring any native dependencies like canvas or sharp.
 * 
 * This creates the icons using a minimal PNG encoder.
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

function createPNG(width, height, bgColor, fgColor) {
  // Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  writeUint32(ihdrData, 0, width);
  writeUint32(ihdrData, 4, height);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type (RGB)
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const ihdrChunk = createChunk('IHDR', ihdrData);

  // Parse colors
  const bgR = parseInt(bgColor.slice(1, 3), 16);
  const bgG = parseInt(bgColor.slice(3, 5), 16);
  const bgB = parseInt(bgColor.slice(5, 7), 16);
  const fgR = parseInt(fgColor.slice(1, 3), 16);
  const fgG = parseInt(fgColor.slice(3, 5), 16);
  const fgB = parseInt(fgColor.slice(5, 7), 16);

  // IDAT - Generate pixel data
  const rawData = [];
  
  // "Q" letter shape as a simple blocky design
  const qShape = createQShape(width, height);
  
  for (let y = 0; y < height; y++) {
    rawData.push(0); // filter byte (none)
    for (let x = 0; x < width; x++) {
      const isFilled = qShape[y * width + x];
      if (isFilled) {
        rawData.push(fgR, fgG, fgB);
      } else {
        rawData.push(bgR, bgG, bgB);
      }
    }
  }

  const rawBuffer = Buffer.from(rawData);
  const compressed = zlib.deflateSync(rawBuffer);
  const idatChunk = createChunk('IDAT', compressed);

  // IEND chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  writeUint32(length, 0, data.length);
  
  const typeAndData = Buffer.concat([
    Buffer.from(type, 'ascii'),
    data
  ]);
  
  const chunkCrc = Buffer.alloc(4);
  writeUint32(chunkCrc, 0, crc32(typeAndData));
  
  return Buffer.concat([length, typeAndData, chunkCrc]);
}

function createQShape(width, height) {
  const pixels = new Array(width * height).fill(false);
  const cx = Math.floor(width / 2);
  const cy = Math.floor(height / 2);
  const outerR = Math.floor(Math.min(width, height) * 0.45);
  const innerR = Math.floor(outerR * 0.6);
  const tailW = Math.floor(outerR * 0.3);
  const tailH = Math.floor(outerR * 0.35);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Outer circle (filled)
      if (dist <= outerR) {
        // Inner circle (hole)
        if (dist > innerR) {
          pixels[y * width + x] = true;
        }
        // The Q tail - bottom right of the donut
        if (dx > 0 && dy > 0 && x > cx + innerR * 0.3 && 
            x < cx + outerR + tailW && y > cy + innerR * 0.7 &&
            y < cy + outerR + tailH) {
          // Fill the tail area if we're outside the inner circle in that region
          const tdx = x - (cx + outerR * 0.7);
          const tdy = y - (cy + outerR * 0.7);
          if (Math.sqrt(tdx * tdx * 0.5 + tdy * tdy) <= tailW) {
            pixels[y * width + x] = true;
          }
        }
      }
    }
  }

  return pixels;
}

function generateIcon(size, outputPath) {
  // Dark blue background (#0b2f66), white "Q" shape
  const png = createPNG(size, size, '#0b2f66', '#ffffff');
  fs.writeFileSync(outputPath, png);
  console.log(`  ✓ Created ${size}x${size}: ${outputPath}`);
}

const outDir = path.join(__dirname, '..', 'assets', 'icons');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

console.log('Generating PWA icons...');
generateIcon(192, path.join(outDir, 'icon-192.png'));
generateIcon(512, path.join(outDir, 'icon-512.png'));
console.log('Done!');