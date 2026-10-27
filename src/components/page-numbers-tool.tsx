"use client";

import { useState } from "react";
import { ToolShell } from "@/components/tool-shell";
import type { PdfEngine } from "@/lib/pdf-worker-client";
import type { Tool } from "@/lib/tools";

export function PageNumbersTool({ tool, engineFactory }: { tool: Tool; engineFactory?: () => PdfEngine }) {
  const [startNumber, setStartNumber] = useState("1");
  const [position, setPosition] = useState("bottom-center");
  const number = startNumber.trim() === "" ? NaN : Number(startNumber);
  return (
    <ToolShell tool={tool.slug} toolName={tool.name} options={{ startNumber: number, position }}
      engineFactory={engineFactory} onReset={() => { setStartNumber("1"); setPosition("bottom-center"); }}>
      <div className="text-tool-fields">
        <label htmlFor="starting-number">Starting number
          <input id="starting-number" type="number" step="1" value={startNumber}
            aria-describedby="numbering-help" onChange={(event) => setStartNumber(event.target.value)} />
        </label>
        <label htmlFor="number-position">Number position
          <select id="number-position" value={position} onChange={(event) => setPosition(event.target.value)}>
            <option value="bottom-center">Bottom centre</option>
            <option value="bottom-right">Bottom right</option>
            <option value="top-right">Top right</option>
          </select>
        </label>
      </div>
      <p id="numbering-help" className="page-grid-help text-tool-help">
        Every page gets the next whole number. You can start at zero or a negative number.
        Numbers follow each page’s visible orientation and stay inside its edges.
      </p>
    </ToolShell>
  );
}
