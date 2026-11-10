import Link from "next/link";
import { Header, Footer } from "@/components/chrome";
import SearchBox from "@/components/SearchBox";
export const metadata = { title: "Stranica nije pronađena" };
export default function NotFound() {
  return (<><Header locale="sr" path="/" /><main className="shell py-20 text-center"><h1 className="font-serif text-3xl font-semibold">Stranica nije pronađena</h1><div className="max-w-xl mx-auto mt-6 text-left"><SearchBox locale="sr" large placeholder="Pretražite instituciju, uslugu ili grad…" submitLabel="Pretraga" /></div><p className="text-muted mt-4">Proverite adresu ili krenite od <Link href="/">početne strane</Link>.</p></main><Footer locale="sr" /></>);
}
