"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { PdfPreviews } from "@/components/pdf-previews";
import { PdfError } from "@/lib/pdf-engine/errors";
import type { PdfOptions } from "@/lib/pdf-engine/protocol";
import { resultOutputs } from "@/lib/pdf-engine/protocol";
import { createPdfEngine, type PdfEngine } from "@/lib/pdf-worker-client";
import { tools } from "@/lib/tools";

export type PreviewProps = {
  file: File;
  onReady: (pages: number) => void;
  onError: (message: string) => void;
  disabled: boolean;
};

type SelectedFile = { id: string; file: File; pages?: number; error?: string };
type Status = "idle" | "ready" | "processing" | "success" | "error";
type Download = { url: string; name: string };

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileRow({ entry, onDetails, onRemove, onMove, index, total, disabled, renderPreviews }: {
  renderPreviews?: (props: PreviewProps) => ReactNode;
  entry: SelectedFile;
  onDetails: (id: string, details: { pages?: number; error?: string }) => void;
  onRemove: (id: string) => void;
  onMove?: (id: string, direction: -1 | 1) => void;
  index: number;
  total: number;
  disabled: boolean;
}) {
  const ready = useCallback((pages: number) => onDetails(entry.id, { pages }), [entry.id, onDetails]);
  const error = useCallback((message: string) => onDetails(entry.id, { error: message }), [entry.id, onDetails]);

  return (
    <li className="file-row">
      <div className="file-row-heading">
        <span className="file-index">{String(index + 1).padStart(2, "0")}</span>
        <span className="file-badge">PDF</span>
        <div className="file-details">
          <p className="file-name" title={entry.file.name}>
            {entry.file.name}
          </p>
          <p className="file-meta">
            {formatSize(entry.file.size)} · {entry.pages === undefined
              ? entry.error ? "Cannot read pages" : "Reading pages…"
              : `${entry.pages} ${entry.pages === 1 ? "page" : "pages"}`}
          </p>
        </div>
        <button type="button" className="shell-button file-action" disabled={disabled}
          aria-label={`Remove ${entry.file.name}`} onClick={() => onRemove(entry.id)}>
          <span aria-hidden="true">×</span>
        </button>
      </div>
      {onMove && <div className="file-order">
        <button type="button" className="shell-button file-action" disabled={disabled || index === 0}
          aria-label={`Move ${entry.file.name} up`} onClick={() => onMove(entry.id, -1)}>
          <span aria-hidden="true">↑</span>
        </button>
        <button type="button" className="shell-button file-action" disabled={disabled || index === total - 1}
          aria-label={`Move ${entry.file.name} down`} onClick={() => onMove(entry.id, 1)}>
          <span aria-hidden="true">↓</span>
        </button>
      </div>}
      {entry.error && <p role="alert" className="mt-3 text-sm text-red-800">{entry.error}</p>}
      {renderPreviews
        ? renderPreviews({ file: entry.file, onReady: ready, onError: error, disabled })
        : <PdfPreviews file={entry.file} onReady={ready} onError={error} />}
    </li>
  );
}

// Tool implementations supply their own options UI and values; the lifecycle stays here.
export function ToolShell({
  tool, toolName, available, maxFiles, compact = false, options = {}, children, onReset, renderPreviews,
  engineFactory = createPdfEngine,
}: {
  renderPreviews?: (props: PreviewProps) => ReactNode;
  tool: string;
  toolName: string;
  available?: boolean;
  maxFiles?: number;
  compact?: boolean;
  options?: PdfOptions;
  children?: ReactNode;
  onReset?: () => void;
  engineFactory?: () => PdfEngine;
}) {
  const config = tools.find((entry) => entry.slug === tool);
  available ??= config?.available ?? false;
  maxFiles ??= config?.maxFiles;
  const minimumFiles = config?.minimumFiles ?? 1;
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("Choose PDFs to preview their pages.");
  const [error, setError] = useState<string>();
  const [downloads, setDownloads] = useState<Download[]>([]);
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const engine = useRef<PdfEngine | null>(null);
  const resultUrls = useRef<string[]>([]);
  const generation = useRef(0);
  const busy = useRef(false);
  const optionsKey = JSON.stringify(options);
  const previousOptions = useRef(optionsKey);
  const focusAfterReset = useRef(false);
  const processing = status === "processing";

  const clearResult = useCallback(() => {
    resultUrls.current.forEach((url) => URL.revokeObjectURL(url));
    resultUrls.current = [];
    setDownloads([]);
  }, []);

  useEffect(() => {
    if (previousOptions.current === optionsKey) return;
    previousOptions.current = optionsKey;
    if (busy.current || !files.length) return;
    clearResult();
    setError(undefined);
    setProgress(0);
    setStatus((current) => current === "idle" ? "idle" : "ready");
    setMessage("Options changed. Save your PDF to create a new result.");
  }, [optionsKey, clearResult, files.length]);

  useEffect(() => () => {
    generation.current++;
    engine.current?.dispose();
    resultUrls.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  useEffect(() => {
    if (status === "idle" && focusAfterReset.current) {
      focusAfterReset.current = false;
      input.current?.focus();
    }
  }, [status]);

  const details = useCallback((id: string, detail: { pages?: number; error?: string }) => {
    setFiles((current) => current.map((entry) => entry.id === id ? { ...entry, ...detail } : entry));
  }, []);

  function choose(selected: File[]) {
    if (busy.current || !selected.length) return;
    const known = new Set(files.map(({ file }) => JSON.stringify([file.name, file.size])));
    const additions: SelectedFile[] = [];
    const duplicates = new Set<string>();
    for (const file of selected) {
      const key = JSON.stringify([file.name, file.size]);
      if (known.has(key)) {
        duplicates.add(file.name);
      } else {
        known.add(key);
        additions.push({ id: crypto.randomUUID(), file });
      }
    }
    if (maxFiles && files.length + additions.length > maxFiles) {
      setError(`Choose exactly one PDF for ${toolName}. Remove the selected file before choosing another.`);
      setMessage("No files were added. Choose one PDF and try again.");
      return;
    }
    setMessage(duplicates.size
      ? Array.from(duplicates, (name) => `${name} is already in the list.`).join(" ")
      : "Files stay on your device. Review the previews below.");
    if (!additions.length) return;
    clearResult();
    setError(undefined);
    setProgress(0);
    setFiles((current) => [...current, ...additions]);
    setStatus("ready");
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

  function move(id: string, direction: -1 | 1) {
    if (busy.current) return;
    const index = files.findIndex((entry) => entry.id === id);
    const next = index + direction;
    if (index < 0 || next < 0 || next >= files.length) return;
    const reordered = [...files];
    [reordered[index], reordered[next]] = [reordered[next], reordered[index]];
    setFiles(reordered);
    clearResult();
    setError(undefined);
    setProgress(0);
    setStatus("ready");
    setMessage(`${files[index].file.name} moved to position ${next + 1}. Merge again to use this order.`);
  }

  function reset() {
    focusAfterReset.current = true;
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
    onReset?.();
    setMessage("Files cleared. Choose PDFs to start again.");
    if (input.current) input.current.value = "";
    input.current?.focus();
  }

  async function run() {
    if (busy.current || files.length < minimumFiles
      || files.some((entry) => entry.error || entry.pages === undefined)) return;
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
      const ready: Download[] = [];
      for (const output of resultOutputs(result)) {
        const url = URL.createObjectURL(new Blob([output.data], { type: output.mimeType }));
        resultUrls.current.push(url);
        ready.push({ url, name: output.name });
      }
      setDownloads(ready);
      setProgress(100);
      setStatus("success");
      setMessage("Done. Nothing was uploaded. Download your result, or start again to clear your files.");
    } catch (failure) {
      if (current !== generation.current) return;
      clearResult();
      setStatus("error");
      setError(failure instanceof PdfError ? failure.message : new PdfError("failed").message);
      setMessage("No result was created. Your files are still available to preview.");
    } finally {
      if (current === generation.current) busy.current = false;
    }
  }

  return (
    <section aria-label={`${toolName} workspace`} className={`tool-workspace ${compact ? "compact-workspace" : ""}`}
      data-empty={files.length === 0}>
      <div className={`drop-zone ${dragging ? "is-dragging" : ""}`}
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
        <span className="drop-plus" aria-hidden="true">+</span>
        <p className="drop-title">{maxFiles === 1 ? "Drop one PDF here" : "Drop PDFs here"}</p>
        <p className="drop-hint">or click to choose from your device</p>
        <p id="pdf-input-help" className="drop-help">
          {available
            ? config?.reorderFiles
              ? "Files merge in the order shown. You can change it before processing."
              : config?.options === "page-grid"
                ? "Choose one PDF, then use the page controls below."
                : "Choose a PDF and enter page ranges."
            : "Previews work today; this PDF tool is coming soon."}
        </p>
        <label className="sr-only" htmlFor="pdf-files">Choose PDF files</label>
        <input ref={input} id="pdf-files" type="file" accept="application/pdf,.pdf" multiple={maxFiles !== 1}
          aria-describedby="pdf-input-help" disabled={processing} className="drop-input"
          onChange={(event) => {
            choose(Array.from(event.currentTarget.files ?? []));
            event.currentTarget.value = "";
          }} />
      </div>

      {files.length > 0 && <div>
        <h2 className="mb-3 text-sm font-semibold">Selected files ({files.length})</h2>
        <ul className="space-y-3">
          {files.map((entry, index) => <FileRow key={entry.id} entry={entry} onDetails={details}
            onRemove={remove} onMove={config?.reorderFiles ? move : undefined}
            index={index} total={files.length} disabled={processing} renderPreviews={renderPreviews} />)}
        </ul>
      </div>}

      <fieldset disabled={processing} className="tool-options min-w-0"
        onChange={() => {
          clearResult();
          setError(undefined);
          setProgress(0);
          setStatus(files.length ? "ready" : "idle");
          setMessage("Options changed. Process your PDF to create a new result.");
        }}>
        <legend className="px-1 text-sm font-semibold">Tool options</legend>
        {children ?? <p className="text-sm text-stone-500">Options will appear when this tool is built.</p>}
      </fieldset>

      {available && minimumFiles > 1 && files.length < minimumFiles && <p className="text-sm text-stone-600">
        Choose at least {minimumFiles} PDFs to merge.
      </p>}

      <div aria-busy={processing} className="workspace-status">
        <p role="status" className="text-sm leading-6 text-stone-600">{message}</p>
        <label htmlFor="pdf-progress" className="mt-2 block text-xs text-stone-500">Progress: {progress}%</label>
        <progress id="pdf-progress" value={progress} max={100} className="mt-2 h-2 w-full" />
      </div>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm leading-6 text-red-800">{error}</p>}

      <div className="workspace-actions">
        <button type="button" className="shell-button shell-primary" onClick={() => void run()}
          disabled={processing || files.length < minimumFiles
            || files.some((entry) => entry.error || entry.pages === undefined)}>
          {processing ? "Processing PDFs…" : status === "error" ? "Try again" : config?.actionLabel ?? "Process PDFs"}
        </button>
        {downloads.length
          ? downloads.map((download) => (
            <a key={download.url} className="shell-button shell-success max-w-full break-all"
              href={download.url} download={download.name}>
              {downloads.length === 1 ? "Download" : `Download ${download.name}`}
            </a>
          ))
          : <button type="button" className="shell-button" disabled>Download</button>}
        <button type="button" className="shell-button" onClick={reset}>Start again</button>
      </div>
    </section>
  );
}
