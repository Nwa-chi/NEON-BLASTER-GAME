import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const base = new URL(`${protocol}://${host}`);
  const description = "Shatter asteroids, build combos, and survive escalating waves in this fast neon arena shooter.";

  return {
    metadataBase: base,
    title: "Neon Blaster — Free Arena Shooter",
    description,
    applicationName: "Neon Blaster",
    manifest: "/manifest.webmanifest",
    openGraph: {
      type: "website",
      url: base,
      title: "Neon Blaster — Free Arena Shooter",
      description,
      images: [{ url: new URL("/og.png", base), width: 1536, height: 1024, alt: "Neon Blaster arcade game" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Neon Blaster — Free Arena Shooter",
      description,
      images: [new URL("/og.png", base)],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
