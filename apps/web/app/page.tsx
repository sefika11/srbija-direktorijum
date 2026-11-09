import { Header, Footer } from "@/components/chrome";
import { Home } from "@/components/pages";
export const revalidate = 3600;
export default async function Page() {
  return (<><Header locale="sr" path="/" /><Home locale="sr" /><Footer locale="sr" /></>);
}
