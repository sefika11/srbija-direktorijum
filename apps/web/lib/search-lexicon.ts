/**
 * Needs lexicon for the search: what people type ("izgubio pasoš", "zubar", "прописка", "Führerschein umtauschen")
 * mapped to the guide, institution type, roadmap or section that answers it. The terms live in search-lexicon.json
 * (four languages, written as people say them); this file folds them once and matches a query against them with
 * stemming, as-you-type prefixes and typo tolerance. Pure JS, no database: a query costs well under a millisecond.
 */
import raw from "./search-lexicon.json";
import moreRoads from "./roadmaps-more.json";                 // the life-situation roadmaps carry their own search terms
import extra from "./search-lexicon-extra.json";   // hand-kept additions: add a missing word here, the generated file stays as it is

export type LexKind = "guide" | "type" | "road" | "path";
export type LexHit = { kind: LexKind; slug: string; score: number; used: Set<number> };
type Entry = { k: LexKind; s: string; t?: string[]; w?: string[]; b?: number };   // b: hand-set preference, added to the score of this entry's strong terms

const CYR: Record<string, string> = { а: "a", б: "b", в: "v", г: "g", д: "d", ђ: "dj", е: "e", ж: "z", з: "z", и: "i", ј: "j", к: "k", л: "l", љ: "lj", м: "m", н: "n", њ: "nj", о: "o", п: "p", р: "r", с: "s", т: "t", ћ: "c", у: "u", ф: "f", х: "h", ц: "c", ч: "c", џ: "dz", ш: "s", ы: "i", э: "e", ю: "ju", я: "ja", ё: "e", й: "j", щ: "sc", ь: "", ъ: "" };
export const cyrToLat = (s: string) => s.toLowerCase().replace(/[Ѐ-ӿ]/g, (c) => CYR[c] ?? c);
export function fold(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "dj").replace(/Đ/g, "dj").replace(/ß/g, "ss").toLowerCase().replace(/[^a-z0-9а-яё ]+/gi, " ").replace(/\s+/g, " ").trim();
}
/** Words that carry no need: dropped from the query and from the lexicon terms alike (so phrases still line up). */
const STOP_RAW = "u za kako gde da se mi me mene sam smo si je su li ili i a na iz do od kod sa po o moj moja moje moju svoj svoje hocu zelim mogu moram treba trebam potreban potrebna potrebno molim sta koji koja koje kada kad neki neku " +
  "the an to get how where in on at of for my me i is are can could need want would like please do does with from what which when some " +
  "wie wo ich in der die das den dem ein eine einen einer mein meine und fur zu im am mochte brauche kann muss will bitte was welche wann " +
  "где как в на мне нужно нужен нужна надо получить хочу могу можно для и или что какой какая мой моя моё с из по о";
export const STOP = new Set(fold(cyrToLat(STOP_RAW)).split(" "));
export const tokenize = (q: string): string[] => fold(cyrToLat(q)).split(" ").filter((t) => t && !STOP.has(t));

/** Rough stemmer shared by both sides: Serbian case and verb endings, plus the commonest English, German and (transliterated) Russian ones. */
export function stem(t: string): string {
  if (t.length === 4) return /[aeiou]$/.test(t) ? t.slice(0, 3) : t;      // beba, bebe, bebu → beb; voda, vode → vod
  if (t.length < 5) return t;
  if (t.length >= 6 && t.endsWith("ing")) return t.slice(0, -3);            // buying → buy, moving → mov(e)
  for (const suf of ["ovima", "evima", "ima", "ama", "ome", "oga", "ega", "ije", "iju", "ing", "ung", "en", "er", "es", "ih", "im", "om", "em", "ov", "ev", "oj", "u", "a", "e", "i", "o", "y", "s"]) if (t.endsWith(suf) && t.length - suf.length >= 4) return t.slice(0, -suf.length);
  return t;
}
/** German "ue/oe/ae" spellings and umlauts meet in one form. Applied to both sides, so it never needs to be right, only consistent. */
const norm = (w: string) => w.replace(/([aou])e(?=[a-z])/g, "$1");

/** Damerau-Levenshtein distance, capped: returns `max + 1` as soon as the words are further apart than `max`. */
export function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev2: number[] = [], prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]; let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur[j] = v; if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    prev2 = prev; prev = cur;
  }
  return prev[b.length];
}

type Word = { w: string; st: string };
type Term = { e: number; words: Word[]; strong: boolean; boost: number };
const ENTRIES = [...(raw as Entry[]), ...(extra as Entry[]), ...(moreRoads as { slug: string; terms?: string[] }[]).filter((r) => r.terms?.length).map((r): Entry => ({ k: "road", s: r.slug, t: r.terms!.filter((x) => x.trim().includes(" ")), w: r.terms!.filter((x) => !x.trim().includes(" ")) }))];
const TERMS: Term[] = [];
/** every folded word of every strong term: a token found here is vocabulary, not a place name guess */
const VOCAB = new Set<string>();
/** every word exactly as some term spells it: a token found here is spelled right, so it is never "corrected" into a neighbour */
const WORDS = new Set<string>();
for (let e = 0; e < ENTRIES.length; e++) {
  for (const [list, strong] of [[ENTRIES[e].t ?? [], true], [ENTRIES[e].w ?? [], false]] as [string[], boolean][]) {
    for (const term of list) {
      const words = tokenize(term).map(norm).map((w) => ({ w, st: stem(w) }));
      if (!words.length || words.length > 4) continue;
      TERMS.push({ e, words, strong, boost: strong ? ENTRIES[e].b ?? 0 : 0 });
      for (const x of words) WORDS.add(x.w);
      if (strong) for (const x of words) { VOCAB.add(x.w); VOCAB.add(x.st); }
    }
  }
}
/** In how many targets a word is a strong term: a word that names few targets decides more than one that names many. */
const DF = new Map<string, Set<number>>();
for (const term of TERMS) if (term.strong) for (const x of term.words) { const set = DF.get(x.st) ?? new Set<number>(); set.add(term.e); DF.set(x.st, set); }
const rarity = (st: string) => { const df = DF.get(st)?.size ?? 1; return df <= 2 ? 1 : Math.max(0.72, 1 - 0.07 * (df - 2)); };
export const isVocabulary = (token: string) => { const n = norm(token); return VOCAB.has(n) || VOCAB.has(stem(n)); };

/** How well one typed token stands for one lexicon word (0 = not at all). `last` = the token the user is still typing. */
function wordQuality(tok: string, tokStem: string, w: Word, last: boolean, known: boolean): number {
  if (tok === w.w) return 1;
  if (tokStem === w.st) return 0.93;
  if (w.w.length <= 2 || tok.length <= 2) return 0;                       // "lk", "ip": exact only
  if (w.w.startsWith(tok)) {                                              // still typing: "paso" → "pasos"
    const part = tok.length / w.w.length;
    if (last && tok.length >= 3) return 0.5 + 0.4 * part;
    if (tok.length >= 4 && part >= 0.6) return 0.78;
    return 0;
  }
  if (tok.startsWith(w.st) && w.st.length >= 4 && tok.length - w.st.length <= 4) return 0.86; // an ending the stemmer does not know
  if (!known && tok.length >= 5 && w.w.length >= 5 && tok[0] === w.w[0]) {            // typos: one slip from 5 letters, two from 9
    const max = tok.length >= 9 && w.w.length >= 9 ? 2 : 1; const d = editDistance(tok, w.w, max);
    if (d <= max) return d === 1 ? 0.8 : 0.64;                              // editDistance answers max + 1 for "further apart"
  }
  return 0;
}

/** Match the (already tokenised) query against the lexicon. Best hits first; `used` = the tokens a hit explains. */
export function lexMatch(tokens: string[]): LexHit[] {
  if (!tokens.length) return [];
  const toks = tokens.map(norm); const stems = toks.map(stem); const known = toks.map((t) => WORDS.has(t));
  const best = new Map<number, { score: number; used: Set<number>; n: number }>();
  for (const term of TERMS) {
    if (term.words.length > toks.length) continue;
    const used = new Set<number>(); let sum = 0, ok = true;
    for (const w of term.words) {
      let bq = 0, bi = -1;
      for (let i = 0; i < toks.length; i++) { if (used.has(i)) continue; const q = wordQuality(toks[i], stems[i], w, i === toks.length - 1, known[i]); if (q > bq) { bq = q; bi = i; } }
      if (bi < 0) { ok = false; break; }
      used.add(bi); sum += bq * (term.words.length === 1 ? rarity(w.st) : 1);
    }
    if (!ok) continue;
    const n = term.words.length;
    // a phrase that explains more of the query is worth more than a single word; a weak term is a hint, not an answer
    const score = (sum / n) * (n === 1 ? 1 : n === 2 ? 1.3 : 1.5) * (term.strong ? 1 : 0.42) * (0.75 + 0.25 * (used.size / toks.length)) + term.boost;
    const cur = best.get(term.e);
    if (!cur) best.set(term.e, { score, used, n: 1 });
    else { cur.n++; if (score > cur.score) { cur.score = score; cur.used = used; } }
  }
  const byTarget = new Map<string, LexHit>();
  for (const [e, v] of best) {
    if (v.score < 0.3) continue;
    const hit: LexHit = { kind: ENTRIES[e].k, slug: ENTRIES[e].s, score: v.score + Math.min(2, v.n - 1) * 0.06, used: v.used };
    const key = `${hit.kind}:${hit.slug}`; const cur = byTarget.get(key);
    if (!cur || hit.score > cur.score) byTarget.set(key, hit);
  }
  return [...byTarget.values()].sort((a, b) => b.score - a.score);
}
