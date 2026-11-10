import type { Metadata } from "next";
import { Header, Footer } from "@/components/chrome";
import { Home } from "@/components/pages";
import { t } from "@/lib/i18n";
import { pageMeta } from "@/lib/seo";
export const revalidate = 3600;
export const metadata: Metadata = pageMeta({ locale: "sr", plain: "/", title: "Gde da idem? – sve institucije Srbije", description: t("sr").tagline, absolute: true });
export default async function Page() {
  return (<><Header locale="sr" path="/" /><Home locale="sr" /><Footer locale="sr" /></>);
}
