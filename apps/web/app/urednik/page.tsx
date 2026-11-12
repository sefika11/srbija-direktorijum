import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { isEditor, login, setSuggestion, setClaim, setLead } from "./actions";

/**
 * The editor's inbox: everything visitors send (corrections, page claims, enquiries) lands in three tables, and this is the
 * one place it is read. Closed unless EDITOR_TOKEN is set in the project; opened with that token once per browser.
 * Marking an item only records the decision. A correction is applied to the data by hand (or by Claude) afterwards.
 */
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Urednik", robots: { index: false, follow: false } };

type Sug = { id: number; kind: string; page_path: string | null; message: string | null; reporter_email: string | null; created_at: string };
type Claim = { id: number; org_name: string | null; type_slug: string | null; org_slug: string | null; claimant_name: string; claimant_role: string | null; email: string; phone: string | null; message: string | null; created_at: string };
type Lead = { id: number; vertical: string | null; page_path: string; payload: unknown; contact_email: string | null; contact_phone: string | null; created_at: string; purge_after: string | null };

const when = (s: string) => s.slice(0, 16).replace("T", " ");
function Row({ children }: { children: React.ReactNode }) { return <li className="card p-4 my-3 text-[14px] leading-relaxed">{children}</li>; }
function Act({ action, id, options }: { action: (fd: FormData) => Promise<void>; id: number; options: [string, string][] }) {
  return (<form action={action} className="mt-3 flex flex-wrap gap-2"><input type="hidden" name="id" value={id} />
    {options.map(([value, label]) => <button key={value} name="status" value={value} className="rounded-md border border-line bg-surface px-3 py-1.5 text-[13.5px] font-medium">{label}</button>)}</form>);
}

export default async function Urednik() {
  const token = process.env.EDITOR_TOKEN;
  if (!token || token.length < 16) notFound();
  if (!(await isEditor())) {
    return (<main className="max-w-md mx-auto px-4 py-16"><h1 className="text-[22px] font-semibold">Urednik</h1>
      <form action={login} className="mt-4 flex gap-2"><input type="password" name="lozinka" aria-label="Lozinka" autoComplete="current-password" className="flex-1 rounded-md border border-line bg-surface px-3 py-2 text-[14px]" required />
        <button className="btn-primary">Uđi</button></form></main>);
  }
  const [sugs, claims, leads] = await Promise.all([
    sql<Sug[]>`select id, kind::text, page_path, message, reporter_email, created_at::text from edit_suggestions where status = 'pending' order by created_at limit 200`,
    sql<Claim[]>`select c.id, o.name_lat as org_name, t.slug as type_slug, o.slug as org_slug, c.claimant_name, c.claimant_role, c.email, c.phone, c.message, c.created_at::text
      from listing_claims c left join organizations o on o.id = c.org_id left join org_types t on t.id = o.org_type_id where c.status = 'pending' order by c.created_at limit 200`,
    sql<Lead[]>`select l.id, v.slug as vertical, l.page_path, l.payload, l.contact_email, l.contact_phone, l.created_at::text, l.purge_after::text
      from leads l left join lead_verticals v on v.id = l.vertical_id where l.status = 'new' and not l.honeypot_tripped order by l.created_at limit 200`,
  ]);
  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-[24px] font-semibold">Urednik</h1>
      <p className="text-muted text-[14px] mt-1">Na čekanju: {sugs.length} ispravki, {claims.length} preuzimanja stranice, {leads.length} upita.</p>

      <h2 className="text-[17px] font-semibold mt-8">Ispravke i prijave</h2>
      {sugs.length === 0 ? <p className="text-muted text-[14px] mt-2">Nema novih.</p> : <ul>{sugs.map((s) => (
        <Row key={s.id}><div className="text-muted text-[12.5px]">{when(s.created_at)} · {s.kind}{s.reporter_email ? ` · ${s.reporter_email}` : ""}</div>
          {s.page_path && <a href={s.page_path} target="_blank" rel="noreferrer">{s.page_path}</a>}
          <p className="mt-1 whitespace-pre-wrap">{s.message}</p>
          <Act action={setSuggestion} id={s.id} options={[["approved", "Prihvaćeno"], ["rejected", "Odbijeno"], ["needs_info", "Treba dopuna"], ["duplicate", "Duplikat"]]} /></Row>))}</ul>}

      <h2 className="text-[17px] font-semibold mt-8">Preuzimanje stranice</h2>
      {claims.length === 0 ? <p className="text-muted text-[14px] mt-2">Nema novih.</p> : <ul>{claims.map((c) => (
        <Row key={c.id}><div className="text-muted text-[12.5px]">{when(c.created_at)}</div>
          {c.org_slug && c.type_slug ? <a href={`/${c.type_slug}/${c.org_slug}`} target="_blank" rel="noreferrer">{c.org_name}</a> : c.org_name}
          <p className="mt-1">{c.claimant_name}{c.claimant_role ? `, ${c.claimant_role}` : ""} · {c.email}{c.phone ? ` · ${c.phone}` : ""}</p>
          {c.message && <p className="mt-1 whitespace-pre-wrap">{c.message}</p>}
          <Act action={setClaim} id={c.id} options={[["verified", "Potvrđeno"], ["rejected", "Odbijeno"]]} /></Row>))}</ul>}

      <h2 className="text-[17px] font-semibold mt-8">Upiti</h2>
      {leads.length === 0 ? <p className="text-muted text-[14px] mt-2">Nema novih.</p> : <ul>{leads.map((l) => (
        <Row key={l.id}><div className="text-muted text-[12.5px]">{when(l.created_at)} · {l.vertical} · briše se {l.purge_after}</div>
          <a href={l.page_path} target="_blank" rel="noreferrer">{l.page_path}</a>
          <p className="mt-1">{[l.contact_phone, l.contact_email].filter(Boolean).join(" · ")}</p>
          <pre className="mt-1 text-[12.5px] whitespace-pre-wrap">{JSON.stringify(l.payload, null, 1)}</pre>
          <Act action={setLead} id={l.id} options={[["accepted", "Preuzeto"], ["rejected", "Odbijeno"], ["spam", "Spam"]]} /></Row>))}</ul>}
    </main>
  );
}
