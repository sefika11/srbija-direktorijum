import Link from "next/link";
import { Header, Footer } from "@/components/chrome";
export default function NotFound() {
  return (<><Header locale="sr" path="/" /><main className="shell py-20 text-center"><h1 className="font-serif text-3xl font-semibold">Stranica nije pronađena</h1><p className="text-muted mt-2">Proverite adresu ili krenite od <Link href="/">početne strane</Link>.</p></main><Footer locale="sr" /></>);
}
