"use client";

import { useState } from "react";
import { ImagePreviews } from "./image-previews";
import { ToolShell } from "./tool-shell";
import type { Tool } from "@/lib/tools";

export function ConverterTool({ tool }: { tool: Tool }) {
  const [ranges, setRanges] = useState("");
  const images = tool.slug === "images-to-pdf";
  return <ToolShell tool={tool.slug} toolName={tool.name} maxFiles={tool.maxFiles}
    options={images ? {} : { ranges }} onReset={() => setRanges("")}
    renderPreviews={images ? (props) => <ImagePreviews {...props} /> : undefined}>
    {images ? <p className="text-sm">JPEG and PNG images become pages in the order shown. No text is recognized.</p>
      : <>
        <label htmlFor="image-ranges" className="block text-sm font-medium">Pages to export</label>
        <input id="image-ranges" type="text" value={ranges} placeholder="All pages"
          onChange={(event) => setRanges(event.target.value)} aria-describedby="image-ranges-help"
          className="mt-2 block w-full min-w-0 rounded-lg border border-stone-300 p-3 text-sm" />
        <p id="image-ranges-help" className="mt-2 text-sm">Leave blank for all pages, or enter ranges such as 1-3, 5.
          One page downloads as a PNG; multiple pages download together in a ZIP.</p>
      </>}
  </ToolShell>;
}
