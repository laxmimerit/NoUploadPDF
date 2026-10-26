"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { PdfPreviews } from "@/components/pdf-previews";
import { PdfError } from "@/lib/pdf-engine/errors";
import type { PdfOptions } from "@/lib/pdf-engine/protocol";
import { createPdfEngine, type PdfEngine } from "@/lib/pdf-worker-client";

type SelectedFile = { id: string; file: File; pages?: number; error?: string };
type Status = "idle" | "ready" | "processing" | "success" | "error";
type Download = { url: string; name: string };

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileRow({ entry, onDetails, onRemove, disabled }: {
  entry: SelectedFile;
  onDetails: (id: string, details: { pages?: number; error?: string }) => void;
  onRemove: (id: string) => void;
  disabled: boolean;
}) {
  const ready = useCallback((pages: number) => onDetails(entry.id, { pages }), [entry.id, onDetails]);
  const error = useCallback((message: string) => onDetails(entry.id, { error: message }), [entry.id, onDetails]);

  return (
    <li className="rounded-xl border border-stone-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-all text-sm font-semibold text-stone-800">{entry.file.name}</p>
          <p className="mt-1 text-xs text-stone-500">
            {formatSize(entry.file.size)} · {entry.pages === undefined
              ? entry.error ? "Cannot read pages" : "Reading pages…"
              : `${entry.pages} ${entry.pages === 1 ? "page" : "pages"}`}
          </p>
        </div>
        <button type="button" className="shell-button shrink-0" disabled={disabled}
          aria-label={`Remove ${entry.file.name}`} onClick={() => onRemove(entry.id)}>
          Remove
        </button>
      </div>
      {entry.error && <p role="alert" className="mt-3 text-sm text-red-800">{entry.error}</p>}
      <PdfPreviews file={entry.file} onReady={ready} onError={error} />
    </li>
  );
}

// Tool implementations supply their own options UI and values; the lifecycle stays here.
export function ToolShell({ tool, toolName, options = {}, children, engineFactory = createPdfEngine }: {
  tool: string;
  toolName: string;
  options?: PdfOptions;
  children?: ReactNode;
  engineFactory?: () => PdfEngine;
}) {
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("Choose PDFs to preview their pages.");
  const [error, setError] = useState<string>();
  const [download, setDownload] = useState<Download>();
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const engine = useRef<PdfEngine | null>(null);
  const resultUrl = useRef<string | undefined>(undefined);
  const generation = useRef(0);
  const busy = useRef(false);
  const processing = status === "processing";

  const clearResult = useCallback(() => {
    if (resultUrl.current) URL.revokeObjectURL(resultUrl.current);
    resultUrl.current = undefined;
    setDownload(undefined);
  }, []);

  useEffect(() => () => {
    generation.current++;
    engine.current?.dispose();
    if (resultUrl.current) URL.revokeObjectURL(resultUrl.current);
  }, []);

  const details = useCallback((id: string, detail: { pages?: number; error?: string }) => {
    setFiles((current) => current.map((entry) => entry.id === id ? { ...entry, ...detail } : entry));
  }, []);

  function choose(selected: File[]) {
    if (busy.current || !selected.length) return;
    clearResult();
    setError(undefined);
    setProgress(0);
    setFiles((current) => [...current, ...selected.map((file) => ({ id: crypto.randomUUID(), file }))]);
    setStatus("ready");
    setMessage("Files stay on your device. Review the previews below.");
  }

  function remove(id: string) {
    if (busy.current) return;
    setFiles((current) => current.filter((entry) => entry.id !== id));
    clearResult();
    setError(undefined);
    setProgress(0);
    setStatus("ready");
    setMessage("Choose PDFs or review the previews below.");
  }

  function reset() {
    generation.current++;
    engine.current?.dispose();
    engine.current = null;
    busy.current = false;
    clearResult();
    setFiles([]);
    setStatus("idle");
    setProgress(0);
    setError(undefined);
    setDragging(false);
    setMessage("Files cleared. Choose PDFs to start again.");
    if (input.current) input.current.value = "";
    input.current?.focus();
  }

  async function run() {
    if (busy.current || !files.length || files.some((entry) => entry.error)) return;
    busy.current = true;
    const current = ++generation.current;
    clearResult();
    setError(undefined);
    setProgress(0);
    setStatus("processing");
    setMessage("Reading your PDFs on this device…");
    try {
      // Keep File objects for previews and retries, but transfer each fresh buffer without copying it.
      const inputs = [];
      for (const { file } of files) {
        const data = await file.arrayBuffer();
        if (current !== generation.current) return;
        inputs.push({ name: file.name, data });
      }
      engine.current ??= engineFactory();
      const result = await engine.current.run({ tool, files: inputs, options }, (value, text) => {
        if (current !== generation.current) return;
        setProgress(Math.min(100, Math.max(0, value)));
        setMessage(text);
      });
      if (current !== generation.current) return;
      const url = URL.createObjectURL(new Blob([result.data], { type: result.mimeType }));
      resultUrl.current = url;
      setDownload({ url, name: result.name });
      setProgress(100);
      setStatus("success");
      setMessage("Your result is ready. Download it, or start again to clear your files.");
    } catch (failure) {
      if (current !== generation.current) return;
      setStatus("error");
      setError(failure instanceof PdfError ? failure.message : new PdfError("failed").message);
      setMessage("No result was created. Your files are still available to preview.");
    } finally {
      if (current === generation.current) busy.current = false;
    }
  }

  return (
    <section aria-label={`${toolName} workspace`} className="mt-7 space-y-5">
      <div className={`rounded-xl border-2 border-dashed p-6 text-center ${dragging
        ? "border-teal-800 bg-teal-50" : "border-stone-300 bg-stone-50"}`}
        onDragOver={(event) => {
          event.preventDefault();
          if (!busy.current) setDragging(true);
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          choose(Array.from(event.dataTransfer.files));
        }}>
        <p className="text-sm font-semibold text-stone-800">Drop PDFs here</p>
        <p id="pdf-input-help" className="mt-1 text-xs leading-5 text-stone-500">
          Or choose files below. Previews work today; PDF tools are coming soon.
        </p>
        <label className="mt-4 inline-block text-sm font-medium text-teal-800" htmlFor="pdf-files">
          Choose PDF files
        </label>
        <input ref={input} id="pdf-files" type="file" accept="application/pdf,.pdf" multiple
          aria-describedby="pdf-input-help" disabled={processing}
          className="mt-2 block w-full min-w-0 text-xs text-stone-600 file:mr-3 file:cursor-pointer
            file:rounded-lg file:border-0 file:bg-teal-800 file:px-4 file:py-3 file:font-semibold file:text-white
            focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-800"
          onChange={(event) => {
            choose(Array.from(event.currentTarget.files ?? []));
            event.currentTarget.value = "";
          }} />
      </div>

      {files.length > 0 && <div>
        <h2 className="mb-3 text-sm font-semibold">Selected files ({files.length})</h2>
        <ul className="space-y-3">
          {files.map((entry) => <FileRow key={entry.id} entry={entry} onDetails={details}
            onRemove={remove} disabled={processing} />)}
        </ul>
      </div>}

      <fieldset disabled={processing} className="min-w-0 rounded-xl border border-stone-200 p-4">
        <legend className="px-1 text-sm font-semibold">Tool options</legend>
        {children ?? <p className="text-sm text-stone-500">Options will appear when this tool is built.</p>}
      </fieldset>

      <div aria-busy={processing}>
        <p role="status" className="text-sm leading-6 text-stone-600">{message}</p>
        <label htmlFor="pdf-progress" className="mt-2 block text-xs text-stone-500">Progress: {progress}%</label>
        <progress id="pdf-progress" value={progress} max={100} className="mt-2 h-2 w-full accent-teal-800" />
      </div>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm leading-6 text-red-800">{error}</p>}

      <div className="flex flex-wrap gap-3">
        <button type="button" className="shell-button shell-primary" onClick={() => void run()}
          disabled={processing || !files.length || files.some((entry) => entry.error || entry.pages === undefined)}>
          {processing ? "Checking PDFs…" : status === "error" ? "Try again" : "Process PDFs"}
        </button>
        {download
          ? <a className="shell-button shell-primary" href={download.url} download={download.name}>Download</a>
          : <button type="button" className="shell-button" disabled>Download</button>}
        <button type="button" className="shell-button" onClick={reset}>Start again</button>
      </div>
    </section>
  );
}
