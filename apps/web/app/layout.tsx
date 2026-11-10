import type { Metadata } from "next";
// Fonts are self-hosted via Fontsource so builds never depend on Google Fonts.
// Display: Unbounded (wide geometric, variable, Latin-ext + Cyrillic). Serif accents: Bona Nova. Text: Commissioner. Labels/codes: JetBrains Mono.
import "@fontsource-variable/unbounded";
import "@fontsource/bona-nova/400.css";
import "@fontsource/bona-nova/400-italic.css";
import "@fontsource-variable/commissioner";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";
import Motion from "@/components/Motion";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3100"),
  title: { default: "Gde da idem? – sve institucije Srbije", template: "%s · Gde da idem?" },
  description: "Sve institucije Srbije na jednom mestu: adresa, telefon, radno vreme i nadležnost.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sr-Latn">
      <body><Motion />{children}</body>
    </html>
  );
}
