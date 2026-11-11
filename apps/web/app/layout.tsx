import type { Metadata, Viewport } from "next";
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

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3100";
const DESC = "Sve javne i privatne institucije Srbije na jednom mestu: adresa, telefon, radno vreme i ko je nadležan za vašu opštinu.";
export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "Gde da idem? – sve institucije Srbije", template: "%s · Gde da idem?" },
  description: DESC,
  applicationName: "Gde da idem?",
  openGraph: { type: "website", siteName: "Gde da idem?", locale: "sr_RS", images: [{ url: "/og.png", width: 1200, height: 630, alt: "Gde da idem?" }] },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
  // Search Console / Bing / Yandex ownership tags: set the env vars in Vercel and they appear here.
  verification: { google: process.env.GOOGLE_SITE_VERIFICATION, yandex: process.env.YANDEX_VERIFICATION, other: process.env.BING_SITE_VERIFICATION ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION } : undefined },
};
export const viewport: Viewport = { themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f6f4ef" }, { media: "(prefers-color-scheme: dark)", color: "#0d1526" }] };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sr-Latn" data-theme="light" suppressHydrationWarning>
      {/* Home, first visit of the session: raise the paper curtain before the first paint so the page never shows under the opener. */}
      <head><script dangerouslySetInnerHTML={{ __html: `(function(){var m=/^\\/(en|ru|de)(\\/|$)/.exec(location.pathname);if(m)document.documentElement.lang=m[1]})();(function(){var th="light";try{if(localStorage.getItem("gdi-theme")==="dark")th="dark"}catch(e){}document.documentElement.setAttribute("data-theme",th)})();(function(){try{var p=location.pathname;if(p.length>1&&p.charAt(p.length-1)==="/")p=p.slice(0,-1);if(["","/","/en","/ru","/de"].indexOf(p)<0)return;if(sessionStorage.getItem("gdi-opener")==="1")return;if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;document.documentElement.classList.add("opener-pending","has-opener")}catch(e){}})()` }} /></head>
      <body><Heritage /><Motion />{children}</body>
    </html>
  );
}
