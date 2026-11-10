import Glyph3D from "@/components/Glyph3D";
import * as db from "@/lib/db";
export const revalidate = 3600;
/** Contact sheet of every institution type with its 3D emblem (QA + design-system reference; not linked from navigation). */
export default async function Page() {
  const types = await db.getOrgTypes();
  const groups = [...new Set(types.map((t) => t.group))];
  return (
    <main className="shell py-10">
      <div className="eyebrow">Design system · 3D emblemi</div>
      <h1 className="display-sm mt-2">Svaka vrsta institucije ima svoj emblem</h1>
      {groups.map((g) => (
        <section key={g} className="mt-10">
          <h2 className="font-mono text-[11px] tracking-[.12em] uppercase text-muted mb-4">{g}</h2>
          <ul className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            {types.filter((t) => t.group === g).map((t) => (
              <li key={t.id} className="card p-4 flex flex-col items-center text-center gap-2">
                <Glyph3D icon={t.icon} size={96} title={t.name_lat} />
                <div className="text-[13px] leading-tight">{t.name_lat}</div>
                <div className="font-mono text-[10.5px] text-muted">{t.icon}</div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
