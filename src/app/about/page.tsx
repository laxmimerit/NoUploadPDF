import type { Metadata } from "next";
import Link from "next/link";
import { FactStrip, Faq } from "@/components/privacy-content";
import { PrivacyPill } from "@/components/privacy-pill";
import { tools } from "@/lib/tools";

export const metadata: Metadata = {
  title: "About — NoUploadPDF",
  description: "Free PDF tools with local processing. Learn what works today and how your files stay on your device.",
};

export default function AboutPage() {
  return (
    <main id="main-content">
      <section className="about-intro text-container section-space">
        <p className="eyebrow">ABOUT NOUPLOADPDF</p>
        <h1>Built so your documents stay yours.</h1>
        <p className="hero-lead">NoUploadPDF does the work inside your browser.
          Merge, split, extract, rotate, and arrange PDF pages on your own device.
          Your contracts, IDs, and invoices are never uploaded.</p>
        <PrivacyPill>Files stay on this device</PrivacyPill>
      </section>
      <div className="container"><FactStrip /></div>
      <section className="about-story text-container section-space" aria-labelledby="privacy-title">
        <p className="eyebrow">THE PRIVACY PROMISE</p>
        <h2 id="privacy-title">Your files have no reason to leave.</h2>
        <p>When you choose a file, your browser reads it locally. Page previews and PDF processing happen on your
          device. Download links save the result straight back to you. We do not send document contents to a server.</p>
        <p>There is no account to create. The available tools are free. Your browser uses your device’s memory
          to work with PDFs, so large documents may need smaller batches.</p>
        <p>You still need an internet connection to load the site and its assets.
          Offline support is not available yet.</p>
      </section>
      <section className="about-availability text-container" aria-labelledby="available-title">
        <h2 id="available-title">What you can do today</h2>
        <ul className="available-tools">{tools.filter((tool) => tool.available).map((tool) => (
          <li key={tool.slug}><Link href={`/tools/${tool.slug}`}><span>{tool.name}</span>
            <span>{tool.description}</span><span aria-hidden="true">↗</span></Link></li>
        ))}</ul>
        <p>The other {tools.filter((tool) => !tool.available).length} tools are coming soon.
          You can preview PDFs on their pages, but they cannot create a result yet.
          Split PDF downloads separate PDFs, with one link for each part.</p>
        <Link href="/#tools" className="shell-button shell-primary">Explore all tools
          <span aria-hidden="true">→</span></Link>
      </section>
      <Faq />
    </main>
  );
}
