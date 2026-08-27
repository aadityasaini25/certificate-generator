
import jsQR from "jsqr";
import { PNG } from "pngjs";
import { readFileSync } from "node:fs";
const png = PNG.sync.read(readFileSync(process.argv[2]));
const r = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
console.log(r ? `DECODED: ${r.data}` : "DECODE FAILED");
