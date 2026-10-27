"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { PdfPreviews } from "@/components/pdf-previews";
import type { PreviewProps } from "@/components/tool-shell";
import { fitSignature, initialSignPlacement, moveSignature, type Signature, type SignPlacement }
  from "@/lib/sign-placement";
import styles from "./sign-pdf.module.css";

export function SignPreview({ file, onReady, onError, disabled, signature, placement, onChange, onPlacementReady }:
  PreviewProps & { signature?: Signature; placement: SignPlacement; onChange: (value: SignPlacement) => void;
    onPlacementReady: (optionsKey?: string) => void }) {
  const [dimensions, setDimensions] = useState<{ file: File; page: number; url: string; aspect: number }>();
  const surface = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    id: number; x: number; y: number; placement: SignPlacement; resize: boolean;
  } | undefined>(undefined);
  useEffect(() => { onChange({ ...initialSignPlacement }); }, [file, onChange]);
  const signatureAspect = signature ? signature.width / signature.height : 3;
  const pageAspect = dimensions?.aspect ?? 1;
  const fitted = fitSignature(placement, pageAspect, signatureAspect);
  const ready = dimensions?.file === file && dimensions.page === placement.page
    && (!signature || (fitted.x === placement.x && fitted.y === placement.y
      && fitted.width === placement.width && fitted.height === placement.height));
  const readyOptions = ready ? JSON.stringify({ signature: signature?.data ?? "", ...placement }) : undefined;
  useEffect(() => { onPlacementReady(readyOptions); }, [readyOptions, onPlacementReady]);
  useEffect(() => () => { onPlacementReady(undefined); }, [onPlacementReady]);
  useEffect(() => {
    // Retain the chosen width while keeping the image proportional on each page.
    if (!signature || !dimensions || dimensions.file !== file || dimensions.page !== placement.page) return;
    const next = fitSignature(placement, pageAspect, signatureAspect);
    if (next.width !== placement.width || next.height !== placement.height
      || next.x !== placement.x || next.y !== placement.y) onChange(next);
  }, [dimensions, file, signature, placement, pageAspect, signatureAspect, onChange]);

  function start(event: PointerEvent<HTMLElement>, resize = false) {
    if (disabled || event.button !== 0 || !event.isPrimary) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    const bounds = surface.current?.getBoundingClientRect();
    if (!bounds?.width || !bounds.height) return;
    drag.current = { id: event.pointerId, x: (event.clientX - bounds.left) / bounds.width,
      y: (event.clientY - bounds.top) / bounds.height, placement, resize };
  }
  function move(event: PointerEvent<HTMLElement>) {
    const current = drag.current;
    const bounds = surface.current?.getBoundingClientRect();
    if (disabled || !current || current.id !== event.pointerId || !bounds?.width || !bounds.height) return;
    const dx = (event.clientX - bounds.left) / bounds.width - current.x;
    const dy = (event.clientY - bounds.top) / bounds.height - current.y;
    const verticalWidth = dy * signatureAspect / pageAspect;
    const resizeWidth = Math.abs(dx) >= Math.abs(verticalWidth) ? dx : verticalWidth;
    onChange(current.resize
      ? fitSignature({ ...current.placement, width: current.placement.width + resizeWidth },
        pageAspect, signatureAspect)
      : moveSignature(current.placement, current.placement.x + dx, current.placement.y + dy));
  }
  function finish(event: PointerEvent<HTMLElement>) {
    if (drag.current?.id !== event.pointerId) return;
    drag.current = undefined;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return <PdfPreviews file={file} onReady={onReady} onError={onError} maxDimension={960}>
    {(thumbnails) => {
      const thumbnail = thumbnails.find((entry) => entry.page === placement.page);
      return <div className={styles.editor}>
        <fieldset disabled={disabled} className={styles.fields}>
          <legend>Signature placement</legend>
          <label>Page to sign
            <select value={placement.page} onChange={(event) => {
              onPlacementReady(undefined);
              setDimensions(undefined);
              onChange({ ...placement, page: Number(event.target.value) });
            }}>
              {thumbnails.map(({ page }) => <option key={page} value={page}>Page {page}</option>)}
            </select>
          </label>
          <label>Left (% of page)
            <input type="number" min="0" max="100" step="0.1" value={Number((placement.x * 100).toFixed(1))}
              onChange={(event) => onChange(moveSignature(placement, Number(event.target.value) / 100, placement.y))} />
          </label>
          <label>Top (% of page)
            <input type="number" min="0" max="100" step="0.1" value={Number((placement.y * 100).toFixed(1))}
              onChange={(event) => onChange(moveSignature(placement, placement.x, Number(event.target.value) / 100))} />
          </label>
          <label>Width (% of page)
            <input type="number" min="2" max="100" step="0.1" value={Number((placement.width * 100).toFixed(1))}
              onChange={(event) => onChange(fitSignature({ ...placement,
                width: Number(event.target.value) / 100 }, pageAspect, signatureAspect))} />
          </label>
        </fieldset>
        <p id="sign-placement-help" className="page-grid-help">
          Drag the signature to move it. Drag the green handle to resize it.
          Use arrow keys to move a focused signature, or the handle’s arrow keys to resize.
          The fields also work with a keyboard. Size stays proportional and inside the page.
        </p>
        {thumbnail ? <div ref={surface} className={styles.page}
          aria-label={`Signature preview, page ${placement.page}`}>
          {/* These local images never go through an image server. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img key={thumbnail.url} className={styles.pageImage} src={thumbnail.url}
            alt={`${file.name}, page ${placement.page}`} onLoad={(event) => {
              const image = event.currentTarget;
              setDimensions({ file, page: placement.page, url: thumbnail.url,
                aspect: image.naturalWidth / image.naturalHeight });
            }} />
          {signature && dimensions?.url === thumbnail.url && <>
            <button type="button" className={styles.signature} disabled={disabled}
              aria-label="Move signature" aria-describedby="sign-placement-help"
              style={{ left: `${placement.x * 100}%`, top: `${placement.y * 100}%`,
                width: `${placement.width * 100}%`, height: `${placement.height * 100}%` }}
              onPointerDown={(event) => start(event)} onPointerMove={move}
              onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={() => { drag.current = undefined; }}
              onKeyDown={(event) => {
                const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }
                  [event.key];
                if (!direction) return;
                event.preventDefault();
                const step = event.shiftKey ? 0.05 : 0.005;
                onChange(moveSignature(placement,
                  placement.x + direction[0] * step, placement.y + direction[1] * step));
              }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={signature.data} alt="Your signature" draggable={false} />
            </button>
            <button type="button" className={styles.resize} disabled={disabled} aria-label="Resize signature"
              aria-describedby="sign-placement-help"
              style={{ left: `calc(${(placement.x + placement.width) * 100}% - 20px)`,
                top: `calc(${(placement.y + placement.height) * 100}% - 20px)` }}
              onPointerDown={(event) => start(event, true)} onPointerMove={move}
              onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={() => { drag.current = undefined; }}
              onKeyDown={(event) => {
                if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
                event.preventDefault();
                const step = (event.shiftKey ? 0.05 : 0.005)
                  * (["ArrowLeft", "ArrowUp"].includes(event.key) ? -1 : 1);
                onChange(fitSignature({ ...placement, width: placement.width + step }, pageAspect, signatureAspect));
              }}>↔</button>
          </>}
        </div> : <p role="status">Preparing the selected page on this device…</p>}
        {!ready && thumbnail && <p role="status">Preparing signature placement on this device…</p>}
      </div>;
    }}
  </PdfPreviews>;
}
