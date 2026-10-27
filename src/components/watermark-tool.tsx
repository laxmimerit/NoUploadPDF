"use client";

import { useState } from "react";
import { WatermarkPreview } from "@/components/watermark-preview";
import { ToolShell } from "@/components/tool-shell";
import { createPdfEngine, type PdfEngine } from "@/lib/pdf-worker-client";
import type { Tool } from "@/lib/tools";


export function WatermarkTool({ tool, engineFactory, previewEngineFactory = createPdfEngine }: {
  tool: Tool;
  engineFactory?: () => PdfEngine;
  previewEngineFactory?: () => PdfEngine;
}) {
  const [text, setText] = useState("DRAFT");
  const [ranges, setRanges] = useState("");
  const [position, setPosition] = useState("center");
  const [opacity, setOpacity] = useState(0.25);
  const options = { text, ranges, position, opacity };
  return (
    <ToolShell tool={tool.slug} toolName={tool.name} options={options} engineFactory={engineFactory}
      renderPreviews={(props) => <WatermarkPreview {...props} options={options} engineFactory={previewEngineFactory} />}
      onReset={() => { setText("DRAFT"); setRanges(""); setPosition("center"); setOpacity(0.25); }}>
      <div className="text-tool-fields">
        <label htmlFor="watermark-text">Watermark text
          <input id="watermark-text" type="text" value={text} maxLength={200} autoComplete="off"
            aria-describedby="watermark-help" onChange={(event) => setText(event.target.value)} />
        </label>
        <label htmlFor="watermark-pages">Pages to watermark
          <input id="watermark-pages" type="text" value={ranges} placeholder="All pages, or 1-3, 7"
            autoComplete="off" spellCheck={false} aria-describedby="watermark-help"
            onChange={(event) => setRanges(event.target.value)} />
        </label>
        <label htmlFor="watermark-position">Watermark position
          <select id="watermark-position" value={position} onChange={(event) => setPosition(event.target.value)}>
            <option value="center">Centre</option>
            <option value="diagonal">Diagonal</option>
          </select>
        </label>
        <label htmlFor="watermark-opacity">Opacity: {Math.round(opacity * 100)}%
          <input id="watermark-opacity" type="range" min="5" max="50" step="5" value={Math.round(opacity * 100)}
            onChange={(event) => setOpacity(Number(event.target.value) / 100)} />
        </label>
      </div>
      <p id="watermark-help" className="page-grid-help text-tool-help">
        Leave pages empty to mark every page, or enter page numbers and ranges starting at 1.
        Use one line of Latin letters, numbers, and punctuation. Text fits inside each page automatically.
        The local placement preview above uses the same watermark as your download.
      </p>
    </ToolShell>
  );
}
