// Genera public/og.png (1200x630), apple-touch-icon.png e icon-512.png con sharp.
import sharp from "sharp";
import { readFileSync, existsSync } from "node:fs";

// Sin foto: la identidad del Vasco es el avatar 3D de la web.
const vasco = null;

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="bg" cx="25%" cy="0%" r="90%">
      <stop offset="0" stop-color="#0f2a1c"/>
      <stop offset="0.5" stop-color="#070b10"/>
      <stop offset="1" stop-color="#05080c"/>
    </radialGradient>
    <linearGradient id="neon" x1="0" x2="1">
      <stop offset="0" stop-color="#4dff9a"/>
      <stop offset="1" stop-color="#b8ff3b"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="10" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <clipPath id="card"><rect x="820" y="90" width="300" height="450" rx="36"/></clipPath>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#05080c" stop-opacity="0"/><stop offset="1" stop-color="#05080c" stop-opacity="0.95"/></linearGradient>
    <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
      <path d="M60 0H0V60" fill="none" stroke="#4dff9a" stroke-opacity="0.08"/>
    </pattern>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#grid)"/>
  <circle cx="1000" cy="560" r="260" fill="#4dff9a" opacity="0.08"/>

  <text x="80" y="120" font-family="Arial Black, Arial, Helvetica, sans-serif" font-weight="900" font-size="19" letter-spacing="6" fill="#4dff9a">AGENDA DIARIA DE FÚTBOL · UY</text>
  <text x="76" y="230" font-family="Arial Black, Arial, Helvetica, sans-serif" font-weight="900" font-size="104" fill="#f3f6fa">VASCO,</text>
  <text x="76" y="330" font-family="Arial Black, Arial, Helvetica, sans-serif" font-weight="900" font-size="104" fill="none" stroke="#4dff9a" stroke-width="3">NO SABÉS</text>
  <text x="76" y="430" font-family="Arial Black, Arial, Helvetica, sans-serif" font-weight="900" font-size="104" fill="url(#neon)" filter="url(#glow)">NADA.</text>
  <text x="80" y="490" font-family="Arial, Helvetica, sans-serif" font-size="28" fill="#b5c0cd">El fútbol de hoy, para los que saben</text>
  <text x="80" y="528" font-family="Arial, Helvetica, sans-serif" font-size="28" fill="#b5c0cd">(y para Vasco).</text>

  <g>
    <rect x="80" y="560" width="300" height="36" rx="18" fill="#4dff9a" opacity="0.14"/>
    <circle cx="104" cy="578" r="6" fill="#4dff9a"/>
    <text x="120" y="585" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" fill="#4dff9a">Escudos reales · hora uruguaya</text>
  </g>

  ${
    vasco
      ? `
  <g transform="rotate(-6 970 315)">
    <rect x="814" y="84" width="312" height="462" rx="40" fill="#4dff9a" opacity="0.9"/>
    <rect x="820" y="90" width="300" height="450" rx="36" fill="#0a0f16"/>
    <image href="data:image/jpeg;base64,${vasco}" x="820" y="90" width="300" height="450" preserveAspectRatio="xMidYMid slice" clip-path="url(#card)"/>
    <rect x="820" y="400" width="300" height="140" rx="0" fill="url(#fade)" clip-path="url(#card)"/>
    <rect x="880" y="490" width="180" height="34" rx="17" fill="#4dff9a"/>
    <text x="970" y="513" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="16" letter-spacing="3" fill="#05080c">EL VASCO</text>
  </g>
  <g transform="translate(640 40)">
    <path d="M0 40 q0 -40 40 -40 h150 q40 0 40 40 v30 q0 40 -40 40 h-110 l-40 34 v-34 q-40 0 -40 -40z" fill="#f3f6fa"/>
    <text x="115" y="58" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="22" fill="#05080c">no sé nada</text>
  </g>`
      : ""
  }
</svg>`;

await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile("public/og.png");

const icon = readFileSync("public/icon.svg");
await sharp(icon, { density: 400 }).resize(180, 180).png().toFile("public/apple-touch-icon.png");
await sharp(icon, { density: 400 }).resize(512, 512).png().toFile("public/icon-512.png");
console.log("ok -> public/og.png, apple-touch-icon.png, icon-512.png");
