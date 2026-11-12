"use server";
import { cookies } from "next/headers";
import { createHash, timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";

const hash = (s: string) => createHash("sha256").update(s).digest("hex");

/** The editor is whoever holds EDITOR_TOKEN (set in the project). Without the variable the page does not exist. */
export async function isEditor(): Promise<boolean> {
  const token = process.env.EDITOR_TOKEN;
  if (!token || token.length < 16) return false;
  const c = (await cookies()).get("gd_editor")?.value;
  return !!c && c === hash(token);
}

export async function login(fd: FormData) {
  const token = process.env.EDITOR_TOKEN;
  if (!token || token.length < 16) return;
  await new Promise((r) => setTimeout(r, 600));   // slows guessing
  const a = Buffer.from(hash(String(fd.get("lozinka") ?? ""))), b = Buffer.from(hash(token));
  if (timingSafeEqual(a, b)) (await cookies()).set("gd_editor", hash(token), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 60 * 60 * 24 * 30, path: "/urednik" });
  revalidatePath("/urednik");
}

const pickStatus = (fd: FormData, allowed: string[]) => { const s = String(fd.get("status") ?? ""); const id = Number(fd.get("id")); return allowed.includes(s) && Number.isInteger(id) && id > 0 ? { s, id } : null; };

export async function setSuggestion(fd: FormData) {
  const v = pickStatus(fd, ["approved", "rejected", "duplicate", "needs_info"]);
  if (!v || !(await isEditor())) return;
  await sql`update edit_suggestions set status = ${v.s}::edit_status, reviewed_at = now(), reviewer = 'urednik' where id = ${v.id}`;
  revalidatePath("/urednik");
}
export async function setClaim(fd: FormData) {
  const v = pickStatus(fd, ["verified", "rejected"]);
  if (!v || !(await isEditor())) return;
  await sql`update listing_claims set status = ${v.s}, verified_at = case when ${v.s} = 'verified' then now() else verified_at end, reviewed_by = 'urednik' where id = ${v.id}`;
  revalidatePath("/urednik");
}
export async function setLead(fd: FormData) {
  const v = pickStatus(fd, ["accepted", "rejected", "spam"]);
  if (!v || !(await isEditor())) return;
  await sql`update leads set status = ${v.s}::lead_status where id = ${v.id}`;
  revalidatePath("/urednik");
}
