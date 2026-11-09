import type { Metadata } from "next";
// Fonts are self-hosted via Fontsource so builds never depend on Google Fonts.
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-serif/500.css";
import "@fontsource/ibm-plex-serif/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3100"),
  title: { default: "Adresar uprave", template: "%s · Adresar uprave" },
  description: "Sve institucije Srbije na jednom mestu: adresa, telefon, radno vreme i nadležnost.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sr-Latn">
      <body>{children}</body>
    </html>
  );
}
