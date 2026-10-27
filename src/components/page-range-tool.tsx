"use client";

import { useState } from "react";
import { ToolShell } from "@/components/tool-shell";
import type { Tool } from "@/lib/tools";

export function PageRangeTool({ tool }: { tool: Tool }) {
  const [ranges, setRanges] = useState("");

  return (
    <ToolShell tool={tool.slug} toolName={tool.name} available={tool.available} maxFiles={tool.maxFiles}
      options={{ ranges }} onReset={() => setRanges("")}>
      <label htmlFor="page-ranges" className="block text-sm font-medium text-stone-800">Page ranges</label>
      <input id="page-ranges" type="text" value={ranges} placeholder="1-3, 7, 10-12"
        aria-describedby="page-ranges-help" autoComplete="off" spellCheck={false}
        onChange={(event) => setRanges(event.target.value)}
        className="mt-2 block w-full min-w-0 rounded-lg border border-stone-300 p-3 text-sm
          focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800" />
      <p id="page-ranges-help" className="mt-2 text-sm leading-6 text-stone-600">
        Use page numbers starting at 1. Separate pages or ranges with commas, for example 1-3, 7, 10-12.
        {tool.slug === "split-pdf"
          ? " Each part creates a separate PDF. Only the pages you list are saved; ranges may overlap."
          : " Selected pages are saved in source order in one PDF. Repeated pages appear only once."}
      </p>
    </ToolShell>
  );
}
