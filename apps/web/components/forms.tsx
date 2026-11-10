"use client";
import { useState } from "react";
import type { Locale } from "@/lib/i18n";
import { t } from "@/lib/i18n";

type Field = { name: string; label: string; type: string; required?: boolean; options?: string[] };

export function LeadForm({ locale, vertical, context }: {
  locale: Locale;
  vertical: { slug: string; name_lat: string; pitch_lat: string | null; form_schema: unknown };
  context: { page_path: string; location_id: number | null; territorial_unit_id: number | null };
}) {
  const d = t(locale);
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const fields = (Array.isArray(vertical.form_schema) ? (vertical.form_schema as Field[]) : []).slice(0, 3);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");
    const fd = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = {};
    fd.forEach((v, k) => { payload[k] = v; });
    const r = await fetch("/api/upit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ vertical: vertical.slug, payload, ...context }) });
    setState(r.ok ? "done" : "error");
  }
  return (
    <section data-ad-slot="loc_lead_form" className="relative rounded-lg border border-moss/40 bg-moss-soft/50 p-4 sm:p-5 my-6">
      <div className="eyebrow text-moss">● {d.localPartner}</div>
      <h3 className="text-[16px] font-semibold mt-1">{vertical.pitch_lat ?? vertical.name_lat}</h3>
      <p className="text-[12.5px] text-muted mt-0.5">{d.freeNoObligation}</p>
      {state === "done" ? (
        <p className="mt-3 text-[14px] text-moss font-medium">{d.thanks}</p>
      ) : (
        <>
          {!open && <button type="button" onClick={() => setOpen(true)} className="sm:hidden mt-3 w-full rounded-md bg-moss text-white py-2.5 text-[14px] font-medium">{d.sendRequest}</button>}
          <form onSubmit={submit} className={`${open ? "" : "hidden sm:block"} mt-3`}>
            <div className="grid sm:grid-cols-2 gap-2">
              <input name="ime" required placeholder={d.nameLabel} className="rounded-md border border-line bg-surface px-3 py-2 text-[14px]" />
              <input name="telefon" required type="tel" placeholder={d.phoneLabel} className="rounded-md border border-line bg-surface px-3 py-2 text-[14px]" />
              {fields.filter((f) => !["ime", "telefon"].includes(f.name)).slice(0, 1).map((f) =>
                f.type === "select" ? (
                  <select key={f.name} name={f.name} className="sm:col-span-2 rounded-md border border-line bg-surface px-3 py-2 text-[14px]" defaultValue="">
                    <option value="" disabled>{f.label}</option>
                    {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input key={f.name} name={f.name} placeholder={f.label} className="sm:col-span-2 rounded-md border border-line bg-surface px-3 py-2 text-[14px]" />
                ))}
            </div>
            <input type="text" name="website_url" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
            <label className="flex items-start gap-2 mt-3 text-[12.5px] text-muted"><input type="checkbox" name="viber" value="1" className="mt-0.5" /> {d.viber}</label>
            <label className="flex items-start gap-2 mt-1.5 text-[12.5px] text-muted"><input type="checkbox" name="consent" required className="mt-0.5" /> <span>{d.consent} <a href="/privatnost">{d.privacy}</a></span></label>
            <button type="submit" disabled={state === "sending"} className="mt-3 rounded-md bg-moss text-white px-4 py-2 text-[14px] font-medium disabled:opacity-60">{d.sendRequest}</button>
            {state === "error" && <span className="ml-3 text-[13px] text-brick">Greška, pokušajte ponovo.</span>}
          </form>
        </>
      )}
    </section>
  );
}

export function CorrectionBlock({ locale, entityType, entityId, pagePath, lastChecked, sources }: {
  locale: Locale; entityType: string; entityId: number; pagePath: string; lastChecked: string | null; sources: string[];
}) {
  const d = t(locale);
  const [mode, setMode] = useState<"idle" | "correction" | "closed" | "done">("idle");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await fetch("/api/predlog", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ entity_type: entityType, entity_id: entityId, kind: mode === "closed" ? "closed" : "correction", message: fd.get("message"), email: fd.get("email"), page_path: pagePath }) });
    setMode("done");
  }
  return (
    <section id="izmeni" className="card p-4 sm:p-5 my-6 scroll-mt-24">
      <h2 className="text-[16px] font-semibold">{d.isDataCorrect}</h2>
      <p className="text-[12.5px] text-muted mt-1 [overflow-wrap:anywhere]">{d.lastChecked}: {lastChecked ? new Date(lastChecked).toLocaleDateString("sr-Latn") : "—"} · {d.source}: {sources.map((u) => u.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")).join(", ")}</p>
      {mode === "done" ? <p className="mt-3 text-[14px] text-moss font-medium">{d.thanksEdit}</p> : mode === "idle" ? (
        <div className="flex flex-wrap gap-2 mt-3">
          <button type="button" onClick={() => setMode("correction")} className="rounded-md border border-line bg-surface px-3 py-1.5 text-[13.5px] font-medium">{d.editData}</button>
          <button type="button" onClick={() => setMode("closed")} className="rounded-md border border-line bg-surface px-3 py-1.5 text-[13.5px] font-medium">{d.reportClosed}</button>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-3 grid gap-2">
          <textarea name="message" required rows={3} placeholder={d.whatIsWrong} className="rounded-md border border-line bg-surface px-3 py-2 text-[14px]" />
          <input name="email" type="email" placeholder={d.yourEmailOptional} className="rounded-md border border-line bg-surface px-3 py-2 text-[14px]" />
          <div><button type="submit" className="rounded-md bg-accent text-white px-4 py-2 text-[14px] font-medium">{d.send}</button></div>
        </form>
      )}
      <p className="text-[12px] text-muted mt-3">{d.reviewNote}</p>
    </section>
  );
}


const CLAIM_L: Record<Locale, { title: string; body: string; cta: string; name: string; role: string; email: string; phone: string; message: string; send: string; done: string; note: string }> = {
  sr: { title: "Da li ste vi ova institucija?", body: "Preuzmite stranicu: ispravke radnog vremena, telefona i opisa objavljujemo odmah, a uz vaš naziv stoji oznaka „Potvrđeno od institucije“. Besplatno.", cta: "Preuzmi stranicu", name: "Ime i prezime", role: "Uloga (npr. direktor, vlasnik, PR)", email: "Službeni e-mail", phone: "Telefon (opciono)", message: "Šta treba ispraviti (opciono)", send: "Pošalji zahtev", done: "Hvala. Proveravamo zahtev i javljamo se na službeni e-mail u roku od 2 radna dana.", note: "Zahtev proverava urednik; podaci se koriste samo za potvrdu." },
  en: { title: "Is this your institution?", body: "Claim the page: corrections to hours, phones and description go live at once and your name carries the “Confirmed by the institution” mark. Free.", cta: "Claim this page", name: "Full name", role: "Role (e.g. director, owner, PR)", email: "Official e-mail", phone: "Phone (optional)", message: "What should be corrected (optional)", send: "Send request", done: "Thank you. We verify the request and reply to the official e-mail within 2 working days.", note: "An editor reviews the request; the data is used only for verification." },
  ru: { title: "Это ваше учреждение?", body: "Получите доступ к странице: исправления часов работы, телефонов и описания публикуются сразу, а рядом с названием появляется отметка «Подтверждено учреждением». Бесплатно.", cta: "Получить доступ", name: "Имя и фамилия", role: "Роль (директор, владелец, PR)", email: "Служебный e-mail", phone: "Телефон (необязательно)", message: "Что исправить (необязательно)", send: "Отправить", done: "Спасибо. Мы проверим запрос и ответим на служебный e-mail в течение 2 рабочих дней.", note: "Запрос проверяет редактор; данные используются только для подтверждения." },
  de: { title: "Ist das Ihre Einrichtung?", body: "Übernehmen Sie die Seite: Korrekturen an Öffnungszeiten, Telefon und Beschreibung gehen sofort online, und Ihr Name trägt die Marke „Von der Einrichtung bestätigt“. Kostenlos.", cta: "Seite übernehmen", name: "Vor- und Nachname", role: "Rolle (z. B. Leitung, Inhaber, PR)", email: "Dienstliche E-Mail", phone: "Telefon (optional)", message: "Was korrigiert werden soll (optional)", send: "Anfrage senden", done: "Danke. Wir prüfen die Anfrage und antworten innerhalb von 2 Werktagen an die dienstliche E-Mail.", note: "Eine Redaktion prüft die Anfrage; die Daten dienen nur der Bestätigung." },
};
export function ClaimBlock({ locale, orgId, locationId }: { locale: Locale; orgId: number; locationId?: number | null }) {
  const L = CLAIM_L[locale];
  const [mode, setMode] = useState<"idle" | "form" | "done">("idle");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const fd = new FormData(e.currentTarget);
    await fetch("/api/claim", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ org_id: orgId, location_id: locationId ?? null, name: fd.get("name"), role: fd.get("role"), email: fd.get("email"), phone: fd.get("phone"), message: fd.get("message") }) });
    setMode("done");
  }
  return (
    <section id="preuzmi" className="card p-4 sm:p-5 my-6 scroll-mt-24 claim">
      <h2 className="text-[16px] font-semibold">{L.title}</h2>
      <p className="text-[13.5px] text-muted mt-1 max-w-[62ch]">{L.body}</p>
      {mode === "done" ? <p className="mt-3 text-[14px] text-moss font-medium">{L.done}</p> : mode === "idle" ? (
        <div className="mt-3"><button type="button" onClick={() => setMode("form")} className="btn-primary">{L.cta}</button></div>
      ) : (
        <form onSubmit={submit} className="mt-3 grid gap-2 sm:grid-cols-2">
          <input name="name" required placeholder={L.name} className="rounded-md border border-line bg-surface px-3 py-2 text-[14px]" />
          <input name="role" placeholder={L.role} className="rounded-md border border-line bg-surface px-3 py-2 text-[14px]" />
          <input name="email" type="email" required placeholder={L.email} className="rounded-md border border-line bg-surface px-3 py-2 text-[14px]" />
          <input name="phone" placeholder={L.phone} className="rounded-md border border-line bg-surface px-3 py-2 text-[14px]" />
          <textarea name="message" rows={2} placeholder={L.message} className="rounded-md border border-line bg-surface px-3 py-2 text-[14px] sm:col-span-2" />
          <div className="sm:col-span-2"><button type="submit" className="btn-primary">{L.send}</button></div>
        </form>
      )}
      <p className="text-[12px] text-muted mt-3">{L.note}</p>
    </section>
  );
}
