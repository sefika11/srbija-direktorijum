/**
 * Tell the editor that something arrived (a correction, a page claim, an enquiry). The message carries no personal data:
 * only what kind of thing it is and the page it came from; the content is read in /urednik.
 * Sends through Resend when RESEND_API_KEY and EDITOR_EMAIL are set in the project; otherwise it does nothing and the
 * item simply waits in /urednik. Never throws: a failed notice must not fail the visitor's form.
 */
export async function notifyEditor(kind: "ispravka" | "preuzimanje stranice" | "upit", pagePath: string | null) {
  const key = process.env.RESEND_API_KEY, to = process.env.EDITOR_EMAIL;
  if (!key || !to) return;
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST", signal: AbortSignal.timeout(4000),
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ from: process.env.EDITOR_FROM ?? "Gde da idem? <onboarding@resend.dev>", to: [to], subject: `Gde da idem?: ${kind}`,
        text: `Stiglo je: ${kind}.\nStranica: ${base}${pagePath ?? ""}\nOtvorite ${base}/urednik da pročitate i rešite.` }),
    });
  } catch { /* the item is in the database either way */ }
}
