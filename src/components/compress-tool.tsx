"use client";

import { useState } from "react";
import { ToolShell } from "@/components/tool-shell";
import type { PdfEngine } from "@/lib/pdf-worker-client";
import type { Tool } from "@/lib/tools";

export function CompressTool({ tool, engineFactory }: { tool: Tool; engineFactory?: () => PdfEngine }) {
  const [mode, setMode] = useState("cleanup");
  const [quality, setQuality] = useState("smaller");
  return (
    <ToolShell tool={tool.slug} toolName={tool.name}
      options={mode === "scan" ? { mode, quality } : { mode }} engineFactory={engineFactory}
      onReset={() => { setMode("cleanup"); setQuality("smaller"); }}>
      <div className="text-tool-fields">
        <label htmlFor="compress-mode">Compression mode
          <select id="compress-mode" value={mode} onChange={(event) => setMode(event.target.value)}>
            <option value="cleanup">Clean up</option>
            <option value="scan">Scan</option>
          </select>
        </label>
        {mode === "scan" && <label htmlFor="scan-quality">Scan quality
          <select id="scan-quality" value={quality} onChange={(event) => setQuality(event.target.value)}>
            <option value="smaller">Smaller file</option>
            <option value="clearer">Clearer image</option>
          </select>
        </label>}
      </div>
      {mode === "cleanup" ? <p className="text-sm"><strong>Clean up</strong> rewrites the PDF without reducing
        image quality or changing pages. The original is offered if the result is not smaller.</p>
        : <p className="text-sm"><strong>Scan</strong> turns each page into a smaller image. Image quality may
          decrease, and text will no longer be selectable or searchable. Links, forms and other interactive
          content will be removed. Signed PDFs are kept unchanged. The original is offered if the result is not smaller.</p>}
    </ToolShell>
  );
}
