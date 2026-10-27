"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { hasPdfHeader, PdfError, readablePdfError } from "@/lib/pdf-engine/errors";

export type Thumbnail = { page: number; url: string };

export function PdfPreviews({ file, onReady, onError, children, renderPages = true, maxDimension = 240 }: {
  maxDimension?: number;
  renderPages?: boolean;
  children?: (thumbnails: Thumbnail[]) => ReactNode;
  file: File;
  onReady: (pages: number) => void;
  onError: (message: string) => void;
}) {
  const generation = useMemo(() => ({ file, onReady, onError, renderPages, maxDimension }),
    [file, onReady, onError, renderPages, maxDimension]);
  const [preview, setPreview] = useState<{ generation: object; thumbnails: Thumbnail[] }>({
    generation, thumbnails: [],
  });
  const thumbnails = preview.generation === generation ? preview.thumbnails : [];

  useEffect(() => {
    let stopped = false;
    let passwordRequested = false;
    const urls: string[] = [];
    const rendered: Thumbnail[] = [];
    let loading: import("pdfjs-dist").PDFDocumentLoadingTask | undefined;
    let rendering: import("pdfjs-dist").RenderTask | undefined;

    async function preview() {
      try {
        const data = await file.arrayBuffer();
        if (stopped) return;
        if (!hasPdfHeader(data)) throw new PdfError("not-pdf");
        // Load pdf.js only in the browser. Its only job here is page previews.
        const pdfjs = await import("pdfjs-dist");
        if (stopped) return;
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
        loading = pdfjs.getDocument({
          data,
          cMapUrl: "/pdfjs/cmaps/",
          cMapPacked: true,
          standardFontDataUrl: "/pdfjs/standard_fonts/",
          wasmUrl: "/pdfjs/wasm/",
          iccUrl: "/pdfjs/iccs/",
          // Preview embedded fonts only; never request document-specified external resources.
          useWorkerFetch: false,
        });
        // Reject even PDFs that open with an empty user password: unlocking is out of scope.
        loading.onPassword = () => {
          passwordRequested = true;
          if (!stopped) onError(new PdfError("password").message);
          void loading?.destroy();
        };
        const pdf = await loading.promise;
        if (stopped) return;
        if (await pdf.getPermissions() !== null) throw new PdfError("password");
        if (stopped) return;
        if (!pdf.numPages) throw new PdfError("damaged");
        onReady(pdf.numPages);
        // Render serially at thumbnail size to bound simultaneous canvas memory.
        for (let number = 1; renderPages && number <= pdf.numPages; number++) {
          if (stopped) return;
          const page = await pdf.getPage(number);
          if (stopped) return;
          const size = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: maxDimension / Math.max(size.width, size.height) });
          const canvas = document.createElement("canvas");
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          rendering = page.render({ canvas, viewport });
          await rendering.promise;
          const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
          canvas.width = canvas.height = 0;
          page.cleanup();
          if (stopped) return;
          if (!blob) throw new PdfError("failed");
          const url = URL.createObjectURL(blob);
          urls.push(url);
          rendered.push({ page: number, url });
          setPreview({ generation, thumbnails: [...rendered] });
        }
        await loading.destroy();
        loading = undefined;
      } catch (error) {
        if (!stopped && !passwordRequested) onError(readablePdfError(error).message);
        void loading?.destroy();
      }
    }
    void preview();
    return () => {
      stopped = true;
      rendering?.cancel();
      void loading?.destroy();
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [file, onReady, onError, renderPages, maxDimension, generation]);

  if (!renderPages) return null;
  if (children) return children(thumbnails);

  return (
    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label={`Page previews for ${file.name}`}>
      {thumbnails.map(({ page, url }) => (
        <figure key={page} className="min-w-0 rounded-lg bg-stone-50 p-2 text-center">
          {/* Local blob previews need native images; they never go through an image server. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={`${file.name}, page ${page}`} className="mx-auto h-36 max-w-full object-contain" />
          <figcaption className="mt-2 text-xs text-stone-500">Page {page}</figcaption>
        </figure>
      ))}
    </div>
  );
}
