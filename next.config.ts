import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";
// ARTIFACT=1: build con rutas relativas para hostear la copia como artifact de Claude.
const artifact = process.env.ARTIFACT === "1";
// GitHub Pages sirve el sitio bajo /<repo>/. En dev se sirve en raíz.
const basePath = isProd && !artifact ? "/vasco-no-sabes-nada" : "";
const assetPrefix = artifact ? "./" : basePath;

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  assetPrefix,
  trailingSlash: true,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: artifact ? "." : basePath },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
