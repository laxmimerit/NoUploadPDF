"use client";

import { useState } from "react";
import { SignatureInput } from "@/components/signature-input";
import { SignPreview } from "@/components/sign-preview";
import { ToolShell } from "@/components/tool-shell";
import { initialSignPlacement, type Signature } from "@/lib/sign-placement";
import type { PdfEngine } from "@/lib/pdf-worker-client";
import type { Tool } from "@/lib/tools";

export function SignPdfTool({ tool, engineFactory }: { tool: Tool; engineFactory?: () => PdfEngine }) {
  const [signature, setSignature] = useState<Signature>();
  const [placement, setPlacement] = useState(initialSignPlacement);
  const [reset, setReset] = useState(0);
  const [readyOptions, setReadyOptions] = useState<string>();
  const options = { signature: signature?.data ?? "", ...placement };
  return <ToolShell tool={tool.slug} toolName={tool.name} engineFactory={engineFactory}
    actionReady={readyOptions === JSON.stringify(options)} options={options}
    onReset={() => { setSignature(undefined); setPlacement(initialSignPlacement); setReset((value) => value + 1); }}
    renderPreviews={(props) => <SignPreview {...props} placement={placement} onChange={setPlacement}
      signature={signature} onPlacementReady={setReadyOptions} />}>
    <SignatureInput key={reset} signature={signature} onChange={setSignature} />
    <p className="page-grid-help">
      This adds a visible signature, not a digital signature. It does not use a signing certificate.
      Form fields become fixed content in the signed copy.
      Your PDF and signature stay on this device. Place and size your signature in the page preview before saving.
    </p>
  </ToolShell>;
}
