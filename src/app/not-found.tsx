import Link from "next/link";
import { PrivacyPill } from "@/components/privacy-pill";

export default function NotFound() {
  return (
    <main id="main-content" className="text-container section-space not-found">
      <p className="eyebrow">404 · PAGE NOT FOUND</p>
      <h1>Let’s get you back to your PDFs.</h1>
      <p className="hero-lead">This page does not exist. Browse the tools to find what you need.</p>
      <PrivacyPill>Files stay on this device</PrivacyPill>
      <div className="hero-actions"><Link href="/" className="shell-button shell-primary">Back to tools</Link></div>
    </main>
  );
}
