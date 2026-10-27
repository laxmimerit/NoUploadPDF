import { createCanvas } from "@napi-rs/canvas";

// Asymmetrical fictional mark makes mirrored and quarter-turned images observable.
const canvas = createCanvas(120, 40);
const context = canvas.getContext("2d");
context.fillStyle = "#ff0000";
context.fillRect(0, 0, 120, 40);
context.fillStyle = "#0000ff";
context.fillRect(0, 0, 25, 10);
export const signature = canvas.toDataURL("image/png");
