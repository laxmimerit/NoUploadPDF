import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About — NoUploadPDF",
  description: "About NoUploadPDF, a collection of browser-based PDF tools currently being built.",
};

export default function AboutPage() {
  return (
    <main id="main-content" className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
      <p className="text-xs font-semibold uppercase tracking-widest text-teal-800">About NoUploadPDF</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-stone-900">PDF tools with privacy in mind.</h1>
      <div className="mt-6 space-y-4 text-base leading-7 text-stone-600">
        <p>
          NoUploadPDF is a collection of free PDF tools being built to handle files in your browser,
          without uploading them.
        </p>
        <p>
          Merge PDF is ready: choose multiple PDFs, set their order, and download one merged file.
          The other tools are marked “Coming soon”; you can choose PDFs and preview every page on your device.
          Your files are never uploaded, including during merging.
        </p>
      </div>
      <Link className="mt-8 inline-block font-medium text-teal-800 underline underline-offset-4" href="/">
        Explore the tools →
      </Link>
    </main>
  );
}
