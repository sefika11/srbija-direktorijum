import type { Metadata } from "next";
// Fonts are self-hosted via Fontsource so builds never depend on Google Fonts.
// Display: Unbounded (wide geometric, variable, Latin-ext + Cyrillic). Serif accents: Bona Nova. Text: Commissioner. Labels/codes: JetBrains Mono.
import Heritage from "@/components/Heritage";
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
    <html lang="sr-Latn" suppressHydrationWarning>
      {/* Home, first visit of the session: raise the paper curtain before the first paint so the page never shows under the opener. */}
      <head><script dangerouslySetInnerHTML={{ __html: `(function(){try{var p=location.pathname;if(p.length>1&&p.charAt(p.length-1)==="/")p=p.slice(0,-1);if(["","/","/en","/ru","/de"].indexOf(p)<0)return;if(sessionStorage.getItem("gdi-opener")==="1")return;if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;document.documentElement.classList.add("opener-pending","has-opener")}catch(e){}})()` }} /></head>
      <body><Heritage /><Motion />{children}</body>
    </html>
  );
}
