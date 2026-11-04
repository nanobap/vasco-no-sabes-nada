import type { Metadata, Viewport } from "next";
import { Manrope, Unbounded } from "next/font/google";
import "./globals.css";
import { SITE, asset } from "@/lib/site";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin"],
  weight: ["500", "700", "900"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} ⚽`,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.tagline,
  applicationName: SITE.name,
  keywords: [
    "fútbol",
    "agenda",
    "partidos de hoy",
    "Uruguay",
    "Champions League",
    "Peñarol",
    "Nacional",
    "Libertadores",
  ],
  openGraph: {
    type: "website",
    locale: "es_UY",
    url: SITE.url,
    siteName: SITE.name,
    title: `${SITE.name} ⚽`,
    description: SITE.tagline,
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: `${SITE.name} — agenda diaria de fútbol`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} ⚽`,
    description: SITE.tagline,
    images: ["/og.png"],
  },
  icons: {
    icon: [{ url: asset("/icon.svg"), type: "image/svg+xml" }],
    apple: [{ url: asset("/apple-touch-icon.png"), sizes: "180x180" }],
  },
  manifest: asset("/manifest.webmanifest"),
};

export const viewport: Viewport = {
  themeColor: "#05080c",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es-UY"
      className={`${manrope.variable} ${unbounded.variable} h-full antialiased`}
    >
      <body className="relative min-h-full flex flex-col">{children}</body>
    </html>
  );
}
