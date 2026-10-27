"use client";

import { useCallback, useRef, useState } from "react";
import { PdfPreviews } from "@/components/pdf-previews";
import { ToolShell, type PreviewProps } from "@/components/tool-shell";
import type { PdfOptions } from "@/lib/pdf-engine/protocol";
import type { Tool } from "@/lib/tools";

type PagePlan = { order: number[]; rotations: number[] };

export function PageGridTool({ tool }: { tool: Tool }) {
  const [options, setOptions] = useState<PdfOptions>({});
  const change = useCallback((plan: PagePlan) => setOptions(plan), []);
  return (
    <ToolShell tool={tool.slug} toolName={tool.name} options={options} onReset={() => setOptions({})}
      renderPreviews={(props) => <PdfPageGrid {...props} organize={tool.slug === "reorder-delete"}
        onChange={change} />}>
      <p className="page-grid-help">{tool.slug === "rotate-pdf"
        ? "Turn individual pages left or right, or turn all pages together. Each turn adds to the current orientation."
        : "Drag pages into order, or use Earlier and Later. Turn or remove pages before saving. One page always stays."}
      </p>
    </ToolShell>
  );
}

export function PdfPageGrid({ file, onReady, onError, disabled, organize, onChange }: PreviewProps & {
  organize: boolean;
  onChange: (plan: PagePlan) => void;
}) {
  const [plan, setPlan] = useState<PagePlan>({ order: [], rotations: [] });
  const original = useRef<PagePlan>({ order: [], rotations: [] });
  const [announcement, setAnnouncement] = useState("");
  const [dragged, setDragged] = useState<number>();
  const [target, setTarget] = useState<number>();
  const cards = useRef(new Map<number, HTMLLIElement>());
  const editor = useRef<HTMLDivElement>(null);
  const pointerDrag = useRef<{ page: number; id: number; x: number; y: number; moved: boolean } | undefined>(undefined);
  const ignoreClick = useRef(false);
  const ready = useCallback((count: number) => {
    const initial = { order: Array.from({ length: count }, (_, i) => i + 1), rotations: Array(count).fill(0) };
    original.current = initial;
    setPlan(initial);
    onChange(initial);
    onReady(count);
  }, [onChange, onReady]);

  function update(next: PagePlan, message: string) {
    if (disabled) return;
    setPlan(next);
    onChange(next);
    setAnnouncement(message);
  }

  function turn(page: number | undefined, amount: number) {
    const rotations = plan.rotations.map((value, index) => page === undefined || page === index + 1
      ? (value + amount + 360) % 360 : value);
    update({ ...plan, rotations }, page === undefined ? "All pages turned." : `Page ${page} turned.`);
  }

  function move(page: number, position: number) {
    const from = plan.order.indexOf(page);
    if (from < 0 || position < 0 || position >= plan.order.length || from === position) return;
    const order = [...plan.order];
    order.splice(from, 1);
    order.splice(position, 0, page);
    update({ ...plan, order }, `Page ${page} moved to position ${position + 1}.`);
    cards.current.get(page)?.focus();
  }

  function remove(page: number) {
    if (disabled || plan.order.length <= 1) return;
    const index = plan.order.indexOf(page);
    const order = plan.order.filter((number) => number !== page);
    update({ ...plan, order }, `Page ${page} removed. ${order.length} pages remain.`);
    cards.current.get(order[Math.min(index, order.length - 1)])?.focus();
  }

  function drop(before?: number, source = dragged) {
    if (source !== undefined && !disabled && before !== source) {
      const from = plan.order.indexOf(source);
      const beforeIndex = before === undefined ? plan.order.length : plan.order.indexOf(before);
      move(source, beforeIndex > from ? beforeIndex - 1 : beforeIndex);
    }
    setDragged(undefined);
    setTarget(undefined);
  }

  function pointerDestination(x: number, y: number): { before?: number } | undefined {
    const hit = document.elementFromPoint(x, y);
    if (!hit || !editor.current?.contains(hit)) return;
    const card = hit.closest<HTMLElement>(".pdf-page-card");
    if (card) return { before: Number(card.dataset.page) };
    if (hit.closest(".page-drop-end")) return {};
  }

  function cancelPointerDrag() {
    pointerDrag.current = undefined;
    setDragged(undefined);
    setTarget(undefined);
  }

  return (
    <PdfPreviews file={file} onReady={ready} onError={onError}>
      {(thumbnails) => <div ref={editor} className="page-editor">
        <div className="page-editor-toolbar">
          <p className="page-grid-help">{plan.order.length} of {plan.rotations.length} pages · {organize
            ? "Drag to reorder. Use Alt + arrow keys on a focused page, or the buttons."
            : "Use the turn buttons on each page."}</p>
          <div className="page-grid-buttons">
            {!organize && <>
              <button type="button" className="shell-button" disabled={disabled || !plan.order.length}
                onClick={() => turn(undefined, -90)}>Turn all left</button>
              <button type="button" className="shell-button" disabled={disabled || !plan.order.length}
                onClick={() => turn(undefined, 90)}>Turn all right</button>
            </>}
            <button type="button" className="shell-button" disabled={disabled || !plan.order.length}
              onClick={() => update(original.current, "Page edits reset. Original pages restored.")}>
              Reset page edits
            </button>
          </div>
        </div>
        <p className="sr-only" role="status">{announcement}</p>
        <ol className="pdf-page-grid" aria-label={`Page previews for ${file.name}`}>
          {plan.order.map((page, index) => {
            const thumbnail = thumbnails.find((entry) => entry.page === page);
            const rotation = plan.rotations[page - 1];
            return <li key={page} className="pdf-page-card" tabIndex={0}
              ref={(node) => { if (node) cards.current.set(page, node); else cards.current.delete(page); }}
              aria-label={`Page ${page}, position ${index + 1} of ${plan.order.length}`}
              data-page={page} data-dragged={dragged === page} data-drop-target={target === page}
              onDragOver={(event) => {
                if (!organize || disabled || dragged === undefined) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setTarget(page);
              }}
              onDrop={(event) => { event.preventDefault(); drop(page); }}
              onKeyDown={(event) => {
                if (event.target !== event.currentTarget || disabled || !organize) return;
                if (event.altKey && ["ArrowLeft", "ArrowUp", "ArrowRight", "ArrowDown"].includes(event.key)) {
                  event.preventDefault();
                  move(page, index + (["ArrowLeft", "ArrowUp"].includes(event.key) ? -1 : 1));
                } else if (event.key === "Delete") { event.preventDefault(); remove(page); }
              }}>
              <div className="page-card-heading">
                <span className="page-position">{String(index + 1).padStart(2, "0")}</span>
                {organize && <button type="button" className="page-drag-handle" disabled={disabled}
                  draggable={!disabled} aria-label={`Drag page ${page}; use Earlier and Later to move with keyboard`}
                  onPointerDown={(event) => {
                    if (disabled || event.button !== 0 || !event.isPrimary) return;
                    // Capture before scrolling can move the small handle away from the held pointer.
                    event.preventDefault();
                    ignoreClick.current = false;
                    pointerDrag.current = { page, id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
                    event.currentTarget.setPointerCapture(event.pointerId);
                  }}
                  onPointerMove={(event) => {
                    const active = pointerDrag.current;
                    if (!active || active.id !== event.pointerId || disabled) return;
                    if (!active.moved && Math.hypot(event.clientX - active.x, event.clientY - active.y) < 4) return;
                    active.moved = true;
                    setDragged(active.page);
                    setTarget(pointerDestination(event.clientX, event.clientY)?.before);
                  }}
                  onPointerUp={(event) => {
                    const active = pointerDrag.current;
                    if (!active || active.id !== event.pointerId) return;
                    pointerDrag.current = undefined;
                    ignoreClick.current = active.moved;
                    const destination = pointerDestination(event.clientX, event.clientY);
                    if (active.moved && destination) drop(destination.before, active.page);
                    else cancelPointerDrag();
                  }}
                  onPointerCancel={cancelPointerDrag}
                  onLostPointerCapture={() => { if (pointerDrag.current) cancelPointerDrag(); }}
                  onClick={() => {
                    if (ignoreClick.current) { ignoreClick.current = false; return; }
                    cards.current.get(page)?.focus();
                    setAnnouncement(`Page ${page} focused. Use Alt + arrow keys to move it.`);
                  }}
                  onDragStart={(event) => {
                    if (disabled || pointerDrag.current) { event.preventDefault(); return; }
                    event.dataTransfer.setData("text/plain", String(page));
                    event.dataTransfer.effectAllowed = "move";
                    setDragged(page);
                  }} onDragEnd={() => { setDragged(undefined); setTarget(undefined); }}>
                  <span aria-hidden="true">⠿</span>
                </button>}
              </div>
              <div className="page-preview-sheet">
                {thumbnail
                  // Local blob images stay in the browser and bypass image optimization.
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={thumbnail.url} alt={`${file.name}, page ${page}`}
                    style={{ transform: `rotate(${rotation}deg)`,
                      maxWidth: rotation % 180 ? "65%" : "90%", maxHeight: rotation % 180 ? "65%" : "90%" }} />
                  : <span className="page-grid-help">Loading preview…</span>}
              </div>
              <p className="page-caption">Page {page}<span>{rotation ? `+${rotation}°` : "Original turn"}</span></p>
              <div className="page-card-actions">
                <button type="button" className="shell-button file-action" disabled={disabled}
                  aria-label={`Turn page ${page} left 90 degrees`} onClick={() => turn(page, -90)}>↶</button>
                <button type="button" className="shell-button file-action" disabled={disabled}
                  aria-label={`Turn page ${page} right 90 degrees`} onClick={() => turn(page, 90)}>↷</button>
                {organize && <button type="button" className="shell-button file-action"
                  disabled={disabled || plan.order.length === 1} aria-label={`Delete page ${page}`}
                  title={plan.order.length === 1 ? "Keep at least one page" : `Delete page ${page}`}
                  onClick={() => remove(page)}>×</button>}
              </div>
              {organize && <div className="page-card-order">
                <button type="button" className="shell-button" disabled={disabled || index === 0}
                  aria-label={`Move page ${page} earlier`} onClick={() => move(page, index - 1)}>← Earlier</button>
                <button type="button" className="shell-button" disabled={disabled || index === plan.order.length - 1}
                  aria-label={`Move page ${page} later`} onClick={() => move(page, index + 1)}>Later →</button>
              </div>}
            </li>;
          })}
        </ol>
        {dragged !== undefined && <div className="page-drop-end" onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => { event.preventDefault(); drop(); }}>Drop here to move to the end</div>}
        {organize && <p className="page-grid-help">At least one page must stay. Reset page edits restores removed pages.</p>}
      </div>}
    </PdfPreviews>
  );
}
