import { afterEach, describe, expect, it, vi } from "vitest";
import { createPdfEngine } from "../src/lib/pdf-worker-client";
import type { PdfJob, PdfReply } from "../src/lib/pdf-engine/protocol";
import { readFixture } from "./fixtures";

afterEach(() => vi.unstubAllGlobals());

describe("PDF worker client", () => {
  it("transfers fresh input, preserves range details, and receives multiple outputs on retry", async () => {
    const posted: { job: PdfJob; transfer: Transferable[] }[] = [];
    let receive!: (event: { data: PdfReply }) => void;
    class WorkerPort {
      set onmessage(handler: typeof receive) { receive = handler; }
      postMessage(job: PdfJob, transfer: Transferable[]) { posted.push({ job, transfer }); }
      terminate() {}
    }
    vi.stubGlobal("Worker", WorkerPort);
    const engine = createPdfEngine();
    const input = await readFixture("report.pdf");
    const failure = engine.run({ tool: "split-pdf", files: [input], options: { ranges: "0" } }, () => {});
    const caught = expect(failure).rejects.toMatchObject({
      code: "invalid-options", message: "Part 1 (\u201c0\u201d): page numbers start at 1.",
    });
    expect(posted[0].transfer).toEqual([input.data]);
    receive({ data: {
      type: "error", id: posted[0].job.id, code: "invalid-options", message: "Part 1 (\u201c0\u201d): page numbers start at 1.",
    } });
    await caught;
    const success = engine.run({ tool: "split-pdf", files: [await readFixture("report.pdf")], options: { ranges: "1,2" } },
      () => {});
    const outputs = [1, 2].map((part) => ({
      name: `part-${part}.pdf`, mimeType: "application/pdf", data: new ArrayBuffer(4),
    }));
    receive({ data: { type: "result", id: posted[1].job.id, result: { outputs } } });
    await expect(success).resolves.toEqual({ outputs });
    engine.dispose();
  });
});

it.each(["damaged", "failed", "invalid-options"] as const)(
  "preserves the named step for a %s worker error", async (code) => {
    let receive!: (event: { data: PdfReply }) => void;
    let posted!: PdfJob;
    class WorkerPort {
      set onmessage(handler: typeof receive) { receive = handler; }
      postMessage(job: PdfJob) { posted = job; }
      terminate() {}
    }
    vi.stubGlobal("Worker", WorkerPort);
    const engine = createPdfEngine();
    const result = engine.run({ tool: "merge-number-compress", files: [await readFixture("invoice.pdf")],
      options: { mode: "cleanup" } }, () => {});
    const caught = expect(result).rejects.toMatchObject({ code, message: "Merge PDF: Choose a fresh copy." });
    receive({ data: { type: "error", id: posted.id, code, message: "Merge PDF: Choose a fresh copy." } });
    await caught;
    engine.dispose();
  },
);
