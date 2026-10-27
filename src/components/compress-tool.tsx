import { ToolShell } from "@/components/tool-shell";
import type { Tool } from "@/lib/tools";

export function CompressTool({ tool }: { tool: Tool }) {
  return (
    <ToolShell tool={tool.slug} toolName={tool.name} options={{ mode: "cleanup" }}>
      <p className="text-sm"><strong>Clean up</strong> rewrites the PDF without reducing image quality or changing pages.
        The original is offered if the result is not smaller.</p>
    </ToolShell>
  );
}
