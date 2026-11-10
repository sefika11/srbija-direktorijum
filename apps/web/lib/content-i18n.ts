// Translations of content the database holds in Serbian only (guide deadlines and fee lines, institution-type
// descriptions and FAQs, partner-form pitches). Keyed by the exact Serbian text, so a string that changes in the
// database simply falls back to Serbian until its translation is added. Server-side only: do not import from a client component.
import type { Locale } from "./i18n";
import guides from "./content-i18n/guides.json";
import types from "./content-i18n/types.json";

type Row = { en?: string; ru?: string; de?: string };
const ALL: Record<string, Row> = { ...(guides as Record<string, Row>), ...(types as Record<string, Row>) };

/** The text in the page's language, or the Serbian original when there is no translation yet. */
export function tx<T extends string | null | undefined>(s: T, locale: Locale): T {
  if (!s || locale === "sr") return s;
  return ((ALL[s as string]?.[locale] as string | undefined) ?? s) as T;
}
