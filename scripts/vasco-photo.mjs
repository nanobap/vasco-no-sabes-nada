// Recorta la cara del Vasco de la foto original (deja afuera a cualquier otra persona)
// y la escala para la intro. Uso: node scripts/vasco-photo.mjs <origen.png>
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const src = process.argv[2];
if (!src) throw new Error("Falta la ruta de la foto de origen");
mkdirSync("public", { recursive: true });

// Coordenadas sobre la imagen original de 190x141: la cara ocupa aprox. x 62..152, y 6..141.
const region = { left: 68, top: 14, width: 80, height: 120 };

await sharp(src)
  .extract(region)
  .resize(540, 810, { kernel: sharp.kernel.lanczos3 })
  .modulate({ saturation: 0.92 })
  .sharpen({ sigma: 1.1, m1: 0.6, m2: 0.4 })
  .jpeg({ quality: 84, mozjpeg: true })
  .toFile("public/vasco.jpg");

console.log("ok -> public/vasco.jpg");
