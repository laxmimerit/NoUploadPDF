import Link from "next/link";
import { Brand } from "@/components/brand";

export function SiteFooter() {
  return (
    <footer className="site-footer container">
      <Brand />
      <p>Private PDF tools. Files stay on your device.</p>
      <Link href="/about">About & privacy <span aria-hidden="true">↗</span></Link>
    </footer>
  );
}
