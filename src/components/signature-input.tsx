"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import type { Signature } from "@/lib/sign-placement";
import styles from "./sign-pdf.module.css";

export function SignatureInput({ signature, onChange }: {
  signature?: Signature; onChange: (signature?: Signature) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const stroke = useRef<number | undefined>(undefined);
  const version = useRef(0);
  const uploads = useRef(new Set<string>());
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
  const [typedName, setTypedName] = useState("");
  useEffect(() => {
    const generation = version;
    const pending = uploads.current;
    return () => { generation.current++; pending.forEach((url) => URL.revokeObjectURL(url)); pending.clear(); };
  }, []);
  function releaseUploads() {
    uploads.current.forEach((url) => URL.revokeObjectURL(url));
    uploads.current.clear();
  }

  function point(event: PointerEvent<HTMLCanvasElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    return { x: (event.clientX - bounds.left) * 600 / bounds.width,
      y: (event.clientY - bounds.top) * 200 / bounds.height };
  }
  function clear() {
    version.current++;
    releaseUploads();
    setReading(false);
    stroke.current = undefined;
    canvas.current?.getContext("2d")?.clearRect(0, 0, 600, 200);
    setError("");
    onChange(undefined);
  }
  async function upload(file: File) {
    const current = ++version.current;
    releaseUploads();
    setError("");
    if (!/\.(png|jpe?g)$/i.test(file.name) || file.size > 10_000_000) {
      setReading(false);
      setError("Choose a PNG or JPEG signature image smaller than 10 MB, or draw your signature.");
      return;
    }
    setReading(true);
    const url = URL.createObjectURL(file);
    uploads.current.add(url);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      if (current !== version.current) return;
      if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 16_000_000) {
        throw new Error("size");
      }
      const copy = document.createElement("canvas");
      // Normalize locally to PNG. Preserve the complete image and its transparency.
      const scale = Math.min(1, 1800 / Math.max(image.naturalWidth, image.naturalHeight));
      copy.width = Math.max(1, Math.round(image.naturalWidth * scale));
      copy.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = copy.getContext("2d");
      if (!context) throw new Error("canvas");
      context.drawImage(image, 0, 0, copy.width, copy.height);
      const data = copy.toDataURL("image/png");
      const width = copy.width;
      const height = copy.height;
      copy.width = copy.height = 0;
      if (canvas.current?.closest("fieldset")?.disabled) return;
      canvas.current?.getContext("2d")?.clearRect(0, 0, 600, 200);
      onChange({ data, width, height });
    } catch {
      if (current === version.current) {
        setError("This image cannot be read or is too large. Choose a smaller PNG or JPEG, or draw your signature.");
      }
    } finally {
      if (uploads.current.delete(url)) URL.revokeObjectURL(url);
      if (current === version.current) setReading(false);
    }
  }

  async function typeSignature() {
    const name = typedName.trim();
    if (!name) return;
    const current = ++version.current;
    setError("");
    setReading(true);
    try {
      const font = '64px "NoUploadPDF Signature"';
      const loaded = await document.fonts.load(font, name);
      if (current !== version.current || canvas.current?.closest("fieldset")?.disabled) return;
      if (!loaded.length) throw new Error("font");
      const image = document.createElement("canvas");
      const context = image.getContext("2d");
      if (!context) throw new Error("canvas");
      context.font = font;
      const size = Math.min(64, 64 * 1600 / Math.max(1, context.measureText(name).width));
      context.font = `${size}px "NoUploadPDF Signature"`;
      const metrics = context.measureText(name);
      const left = Math.max(0, metrics.actualBoundingBoxLeft);
      const right = Math.max(metrics.width, metrics.actualBoundingBoxRight);
      const ascent = Math.max(size, metrics.actualBoundingBoxAscent);
      const descent = Math.max(size / 2, metrics.actualBoundingBoxDescent);
      image.width = Math.ceil(left + right + 24);
      image.height = Math.ceil(ascent + descent + 24);
      // Resizing resets the context. Keep the signature transparent, including in dark mode.
      context.font = `${size}px "NoUploadPDF Signature"`;
      context.fillStyle = "#17171a";
      context.textBaseline = "alphabetic";
      context.fillText(name, left + 12, ascent + 12);
      onChange({ data: image.toDataURL("image/png"), width: image.width, height: image.height });
      image.width = image.height = 0;
    } catch {
      if (current === version.current) {
        setError("The handwriting font could not load. Try again, or draw or upload your signature.");
      }
    } finally {
      if (current === version.current) setReading(false);
    }
  }

  return <div className={styles.input}>
    <p id="signature-draw-help">Draw below with a mouse, pen, or touch, or upload a signature image.</p>
    <canvas ref={canvas} width={600} height={200} className={styles.canvas}
      aria-label="Draw your signature" aria-describedby="signature-draw-help"
      onPointerDown={(event) => {
        if (event.button !== 0 || !event.isPrimary || event.currentTarget.closest("fieldset")?.disabled) return;
        version.current++;
        releaseUploads();
        setReading(false);
        setError("");
        const context = event.currentTarget.getContext("2d");
        if (!context) return;
        stroke.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
        const { x, y } = point(event);
        context.lineWidth = 3;
        context.lineCap = "round";
        context.lineJoin = "round";
        context.strokeStyle = "#17171a";
        context.fillStyle = "#17171a";
        context.beginPath();
        context.arc(x, y, 1.5, 0, 2 * Math.PI);
        context.fill();
        context.beginPath();
        context.moveTo(x, y);
      }}
      onPointerMove={(event) => {
        if (stroke.current !== event.pointerId) return;
        const context = event.currentTarget.getContext("2d");
        const { x, y } = point(event);
        context?.lineTo(x, y);
        context?.stroke();
      }}
      onLostPointerCapture={() => { stroke.current = undefined; }}
      onPointerUp={(event) => {
        if (stroke.current !== event.pointerId) return;
        stroke.current = undefined;
        event.currentTarget.releasePointerCapture(event.pointerId);
        if (event.currentTarget.closest("fieldset")?.disabled) return;
        onChange({ data: event.currentTarget.toDataURL("image/png"), width: 600, height: 200 });
      }}
      onPointerCancel={(event) => {
        if (stroke.current !== event.pointerId) return;
        stroke.current = undefined;
        if (event.currentTarget.closest("fieldset")?.disabled) return;
        onChange({ data: event.currentTarget.toDataURL("image/png"), width: 600, height: 200 });
      }} />
    <label className={styles.upload}>Upload signature (PNG or JPEG)
      <input type="file" accept="image/png,image/jpeg,.png,.jpg,.jpeg" onChange={(event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (file) void upload(file);
      }} />
    </label>
    <label className={styles.typed}>Type your signature
      <input type="text" value={typedName} maxLength={80} autoComplete="off" spellCheck={false}
        aria-describedby="signature-type-help" onChange={(event) => {
          version.current++;
          setReading(false);
          setError("");
          setTypedName(event.target.value);
        }} />
    </label>
    <p id="signature-type-help">Use up to 80 characters. The handwriting font loads from this site.</p>
    <button type="button" className="shell-button" disabled={!typedName.trim() || reading}
      onClick={() => void typeSignature()}>Use typed signature</button>
    <button type="button" className="shell-button" onClick={clear}>Clear signature</button>
    <p role="status">
      {reading ? "Reading signature on this device…" : signature ? "Signature ready." : "Add a signature."}
    </p>
    {error && <p role="alert">{error}</p>}
  </div>;
}
