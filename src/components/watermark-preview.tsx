"use client";

import { useEffect, useRef, useState } from "react";
import { PdfPreviews } from "@/components/pdf-previews";
import type { PreviewProps } from "@/components/tool-shell";
import { PdfError } from "@/lib/pdf-engine/errors";
import { resultOutputs, type PdfOptions } from "@/lib/pdf-engine/protocol";
import { createPdfEngine, type PdfEngine } from "@/lib/pdf-worker-client";

const ignoreReady = () => {};

export function WatermarkPreview({ file, onReady, onError, disabled, options,
  engineFactory = createPdfEngine }: PreviewProps & { options: PdfOptions; engineFactory?: () => PdfEngine }) {
  const key = JSON.stringify(options);
  const [preview, setPreview] = useState<{ source: File; key: string; file?: File; error?: string }>();
  const [renderError, setRenderError] = useState<string>();
  const completed = useRef<{ file: File; key: string } | undefined>(undefined);
  useEffect(() => {
    if (disabled || (completed.current?.file === file && completed.current.key === key)) return;
    completed.current = undefined;
    let stopped = false;
    let engine: PdfEngine | undefined;
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const data = await file.arrayBuffer();
          if (stopped) return;
          engine = engineFactory();
          const result = await engine.run({ tool: "watermark-pdf", files: [{ name: file.name, data }],
            options: JSON.parse(key) }, ignoreReady);
          if (stopped) return;
          const output = resultOutputs(result)[0];
          completed.current = { file, key };
          setRenderError(undefined);
          setPreview({ source: file, key, file: new File([output.data], output.name, { type: output.mimeType }) });
        } catch (error) {
          if (!stopped) setPreview({ source: file, key,
            error: error instanceof PdfError ? error.message : new PdfError("failed").message });
        } finally {
          engine?.dispose();
        }
      })();
    }, 400);
    return () => { stopped = true; clearTimeout(timer); engine?.dispose(); };
  }, [file, key, disabled, engineFactory]);
  const current = preview?.source === file && preview.key === key ? preview : undefined;
  return (
    <div className="watermark-preview">
      <PdfPreviews file={file} onReady={onReady} onError={onError} renderPages={false} />
      <p className="page-grid-help">Placement preview · nothing is uploaded</p>
      {current?.file
        ? <PdfPreviews key={key} file={current.file} onReady={ignoreReady} onError={setRenderError} />
        : <p role="status" className="page-grid-help">{current?.error ?? "Preparing your placement preview…"}</p>}
      {current?.file && renderError && <p role="alert" className="page-grid-help">{renderError}</p>}
    </div>
  );
}
