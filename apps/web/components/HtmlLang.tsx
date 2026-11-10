"use client";
import { useEffect } from "react";
/** Sets <html lang> per page locale (the root layout is shared across locales). */
export default function HtmlLang({ locale }: { locale: string }) {
  useEffect(() => { document.documentElement.lang = locale === "sr" ? "sr-Latn" : locale; }, [locale]);
  return null;
}
