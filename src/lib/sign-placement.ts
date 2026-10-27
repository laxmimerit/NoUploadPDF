// Fractions of the visible page, measured from its top-left corner.
export type SignPlacement = { page: number; x: number; y: number; width: number; height: number };
export type Signature = { data: string; width: number; height: number };
export const initialSignPlacement: SignPlacement = { page: 1, x: 0.1, y: 0.7, width: 0.3, height: 0.1 };

export function fitSignature(placement: SignPlacement, pageAspect: number, signatureAspect: number) {
  const width = Math.min(Math.max(0.02, placement.width), 1, signatureAspect / pageAspect);
  const height = width * pageAspect / signatureAspect;
  return { ...placement, width, height,
    x: Math.max(0, Math.min(1 - width, placement.x)), y: Math.max(0, Math.min(1 - height, placement.y)) };
}

export function moveSignature(placement: SignPlacement, x: number, y: number): SignPlacement {
  return { ...placement, x: Math.max(0, Math.min(1 - placement.width, x)),
    y: Math.max(0, Math.min(1 - placement.height, y)) };
}
