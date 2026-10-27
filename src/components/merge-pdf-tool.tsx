"use client";

import { ToolShell } from "@/components/tool-shell";
import type { Tool } from "@/lib/tools";

export function MergePdfTool({ tool }: { tool: Tool }) {
  return (
    <ToolShell tool={tool.slug} toolName={tool.name} options={{}}>
      <p className="text-sm leading-6 text-stone-600">
        Choose at least two PDFs. Files merge from top to bottom; use Move up and Move down to change the order.
        The download uses the first file’s name, such as report-merged.pdf. No other options are needed.
      </p>
    </ToolShell>
  );
}
