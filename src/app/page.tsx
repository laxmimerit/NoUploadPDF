import Link from "next/link";
import { ToolShell } from "@/components/tool-shell";
import { ToolGrid } from "@/components/tool-grid";
import { FactStrip, Faq, PrivacyBand } from "@/components/privacy-content";
import { PrivacyPill } from "@/components/privacy-pill";
import { tools } from "@/lib/tools";

export default function Home() {
  const ready = tools.filter((tool) => tool.available).length;

  return (
    <main id="main-content">
      <section aria-labelledby="home-title" className="hero container">
        <div className="hero-copy">
          <p className="eyebrow">PRIVATE PDF TOOLS · FREE</p>
          <h1 id="home-title">Your PDFs never leave your device.</h1>
          <p className="hero-lead">Merge, split, arrange, number, and watermark PDF pages directly in your browser.
            Your files stay on your device, from first click to final download.</p>
          <div className="hero-actions">
            <Link href="#tools" className="shell-button shell-primary">Browse {tools.length} tools
              <span aria-hidden="true">↓</span></Link>
            <Link href="#privacy" className="shell-button">How it stays private</Link>
          </div>
          <p className="hero-note">{ready} tools ready to use. {tools.length - ready} more coming soon.</p>
        </div>
        <div className="hero-panel">
          <div className="hero-panel-heading"><h2>Merge PDF</h2><PrivacyPill>On this device</PrivacyPill></div>
          <ToolShell tool="merge-pdf" toolName="Merge PDF" compact />
          <div className="hero-panel-footer"><span>PDF files · 2 or more</span>
            <Link href="/tools/merge-pdf">Open full tool <span aria-hidden="true">↗</span></Link></div>
        </div>
      </section>
      <div className="container"><FactStrip /></div>
      <ToolGrid />
      <PrivacyBand />
      <Faq />
    </main>
  );
}
