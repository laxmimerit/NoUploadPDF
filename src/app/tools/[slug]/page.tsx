import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ToolShell } from "@/components/tool-shell";
import { MergePdfTool } from "@/components/merge-pdf-tool";
import { PageGridTool } from "@/components/page-grid-tool";
import { PageRangeTool } from "@/components/page-range-tool";
import { tools } from "@/lib/tools";
import { PrivacyPill } from "@/components/privacy-pill";
import { ToolCard } from "@/components/tool-grid";

export function generateStaticParams() {
  return tools.map(({ slug }) => ({ slug }));
}

async function getTool(params: PageProps<"/tools/[slug]">["params"]) {
  const { slug } = await params;
  const tool = tools.find((entry) => entry.slug === slug);

  if (!tool) notFound();

  return tool;
}

export async function generateMetadata({ params }: PageProps<"/tools/[slug]">): Promise<Metadata> {
  const tool = await getTool(params);

  return {
    title: `${tool.name} — NoUploadPDF`,
    description: tool.description,
  };
}

export default async function ToolPage({ params }: PageProps<"/tools/[slug]">) {
  const tool = await getTool(params);

  return (
    <main id="main-content" className="tool-page container">
      <nav aria-label="Breadcrumb" className="breadcrumb">
        <Link href="/">All PDF tools</Link><span aria-hidden="true">/</span><span>{tool.name}</span>
      </nav>
      <section aria-labelledby="tool-name">
        <div className="tool-page-heading">
          <p className="eyebrow">{tool.group}</p>
          <h1 id="tool-name">{tool.name}</h1>
          <p className="hero-lead">{tool.description}</p>
          <div className="tool-page-badges"><PrivacyPill>Files stay on this device</PrivacyPill>
            {!tool.available && <span className="coming-badge">Coming soon</span>}
          </div>
          <p className="tool-explanation">
            {tool.available
              ? tool.slug === "merge-pdf"
                ? "Choose PDFs, set their order, and download one merged file. Your files stay on your device."
                : tool.slug === "split-pdf"
                  ? "Choose one PDF and enter ranges. Download a separate PDF for each part, all on your device."
                  : tool.options === "page-grid"
                    ? "Choose one PDF, edit its pages, and save a new copy. Everything runs on your device."
                    : "Choose one PDF and enter the pages you want to save. Everything runs on your device."
              : "Preview your PDFs on your device. This tool is being built and cannot create a result yet."}
          </p>
        </div>
        <div className="tool-panel">
          {tool.slug === "merge-pdf"
            ? <MergePdfTool key={tool.slug} tool={tool} />
            : tool.options === "page-ranges"
              ? <PageRangeTool key={tool.slug} tool={tool} />
              : tool.options === "page-grid"
                ? <PageGridTool key={tool.slug} tool={tool} />
                : <ToolShell key={tool.slug} tool={tool.slug} toolName={tool.name} />}
        </div>
      </section>
      <section className="more-tools section-space" aria-labelledby="more-tools-title">
        <div className="section-heading"><h2 id="more-tools-title">More tools</h2>
          <Link href="/#tools">Browse all tools <span aria-hidden="true">→</span></Link></div>
        <ul className="tool-grid">{tools.filter((entry) => entry.available && entry.slug !== tool.slug)
          .slice(0, 3).map((entry) => (
          <ToolCard key={entry.slug} tool={entry} />
        ))}</ul>
      </section>
    </main>
  );
}
