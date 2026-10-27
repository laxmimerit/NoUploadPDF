"use client";

import { useEffect, useState } from "react";
import type { PreviewProps } from "./tool-shell";

export function ImagePreviews({ file, onReady, onError }: PreviewProps) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    let stopped = false;
    image.onload = () => {
      if (!stopped) {
        setUrl(objectUrl);
        onReady(1);
      }
    };
    image.onerror = () => {
      if (!stopped) onError("This image cannot be read. Choose a valid JPEG or PNG and try again.");
    };
    if (!/\.(jpe?g|png)$/i.test(file.name) && !["image/jpeg", "image/png"].includes(file.type)) {
      onError("Choose a JPEG or PNG image and try again.");
    } else {
      image.src = objectUrl;
    }
    return () => {
      stopped = true;
      image.src = "";
      URL.revokeObjectURL(objectUrl);
    };
  }, [file, onReady, onError]);
  return url ? <div className="mt-4">
    {/* Local object URLs do not use an image server. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={url} alt={`Preview of ${file.name}`} className="h-36 max-w-full object-contain" />
  </div> : null;
}
