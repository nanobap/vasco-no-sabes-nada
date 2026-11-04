import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";
// GitHub Pages sirve el sitio bajo /<repo>/. En dev se sirve en raíz.
const basePath = isProd ? "/vasco-no-sabes-nada" : "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  assetPrefix: basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
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
