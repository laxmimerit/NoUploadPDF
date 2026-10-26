import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { tools } from "@/lib/tools";

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
    <main className="min-h-screen bg-[#fafaf8] px-5 py-8 text-stone-900 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="rounded text-sm font-medium text-teal-800 underline-offset-4 hover:underline
            focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-800"
        >
          ← All PDF tools
        </Link>
        <section
          aria-labelledby="tool-name"
          className="mt-8 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:mt-12 sm:p-10"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-teal-800">{tool.group}</p>
          <h1 id="tool-name" className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            {tool.name}
          </h1>
          <p className="mt-4 text-base leading-7 text-stone-600">{tool.description}</p>
          <p className="mt-6 inline-block rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-600">
            Coming soon
          </p>
          <p className="mt-4 text-sm leading-6 text-stone-500">
            This tool is being built. File processing will be available here when it is ready.
          </p>
        </section>
        <p className="mt-6 text-center text-xs leading-5 text-stone-500">
          NoUploadPDF · Private PDF tools. Your files stay on your device.
        </p>
      </div>
    </main>
  );
}
