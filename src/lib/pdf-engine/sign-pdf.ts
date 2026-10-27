import { PDFBool, PDFContentStream, PDFDict, PDFDocument, PDFDropdown, PDFName, PDFOptionList,
  PDFStream, PDFTextField, PDFWidgetAnnotation, degrees, drawImage } from "@cantoo/pdf-lib";
import { PdfError } from "./errors";
import { pageOutputName } from "./page-plan";
import type { PdfJob, PdfResult } from "./protocol";
import { visiblePage } from "./text-placement";

function flattenForm(document: PDFDocument) {
  const form = document.getForm();
  if (form.acroForm.dict.lookup(PDFName.of("NeedAppearances")) === PDFBool.True) {
    for (const field of form.getFields()) {
      if (field instanceof PDFTextField || field instanceof PDFDropdown || field instanceof PDFOptionList) {
        form.markFieldAsDirty(field.ref);
      }
    }
  }
  form.updateFieldAppearances();
  // Keep form appearances in their original annotation order. Converting widgets to
  // fixed marks preserves their transforms, visibility and print flags in PDF viewers.
  for (const page of document.getPages()) {
    const annotations = page.node.Annots();
    if (!annotations) continue;
    for (let index = 0; index < annotations.size(); index++) {
      const dictionary = document.context.lookup(annotations.get(index));
      if (!(dictionary instanceof PDFDict) || dictionary.lookup(PDFName.of("Subtype")) !== PDFName.of("Widget")) {
        continue;
      }
      const widget = PDFWidgetAnnotation.fromDict(dictionary);
      if (widget.getFlags() & 1) throw new Error("Unsupported invisible widget flag");
      if (!(widget.getFlags() & 2)) {
        let appearance = document.context.lookup(widget.getNormalAppearance());
        if (appearance instanceof PDFDict) {
          appearance = document.context.lookup(appearance.get(widget.getAppearanceState() ?? PDFName.of("Off")));
        }
        if (!(appearance instanceof PDFStream)) throw new Error("Missing form appearance");
      }
      const stamp = dictionary.clone(document.context);
      stamp.set(PDFName.of("Subtype"), PDFName.of("Stamp"));
      for (const key of ["Parent", "Kids", "FT", "AA", "A"]) stamp.delete(PDFName.of(key));
      annotations.set(index, document.context.register(stamp));
    }
  }
  document.catalog.delete(PDFName.of("AcroForm"));
}

export async function signPdf(job: PdfJob, progress: (value: number, message: string) => void): Promise<PdfResult> {
  const invalid = (message: string): never => {
    throw new PdfError("invalid-options", `${message} Correct it and try again.`);
  };
  if (job.files.length !== 1) return invalid("Choose exactly one PDF to sign.");
  const { signature, page, x, y, width, height } = job.options;
  if (Object.keys(job.options).some((key) => !["signature", "page", "x", "y", "width", "height"].includes(key))) {
    return invalid("These signature options are not supported.");
  }
  if (typeof signature !== "string" || signature.length > 15_000_000
    || !/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(signature)) {
    return invalid("Draw a signature or upload a PNG or JPEG signature image.");
  }
  if (typeof page !== "number" || !Number.isSafeInteger(page) || page < 1) {
    return invalid("Choose a page number starting at 1.");
  }
  if (typeof x !== "number" || typeof y !== "number" || typeof width !== "number" || typeof height !== "number"
    || ![x, y, width, height].every(Number.isFinite) || x < 0 || y < 0 || width <= 0 || height <= 0
    || x + width > 1 + 1e-9 || y + height > 1 + 1e-9) {
    return invalid("Keep the signature inside the page with a positive width and height.");
  }
  const document = await PDFDocument.load(job.files[0].data, { updateMetadata: false, preserveXFA: true });
  if (page > document.getPageCount()) return invalid(`Choose a page from 1 to ${document.getPageCount()}.`);
  let image;
  try {
    image = await document.embedPng(signature);
    if (image.width * image.height > 16_000_000) return invalid("Choose a smaller signature image.");
  } catch (error) {
    if (error instanceof PdfError) throw error;
    return invalid("This signature image cannot be read. Draw it again or upload a fresh PNG or JPEG.");
  }
  const target = document.getPage(page - 1);
  const view = visiblePage(target);
  const form = document.getForm();
  if (form.hasXFA()) return invalid("This PDF uses an unsupported XFA form. Export a regular PDF copy to sign.");
  try {
    flattenForm(document);
  } catch {
    return invalid("This PDF's form appearance cannot be preserved. Export a regular PDF copy to sign.");
  }
  const origin = view.point(x * view.width, (1 - y - height) * view.height);
  const opposite = view.point((x + width) * view.width, (1 - y) * view.height);
  const rectangle = [Math.min(origin.x, opposite.x), Math.min(origin.y, opposite.y),
    Math.max(origin.x, opposite.x), Math.max(origin.y, opposite.y)];
  // A final printable appearance paints above existing annotations, just like the preview overlay.
  // Form widgets are fixed appearances, preserving their visibility, saved geometry and paint order.
  const appearance = PDFContentStream.of(document.context.obj({
    Type: "XObject", Subtype: "Form", BBox: rectangle,
    Resources: { XObject: { Signature: image.ref } },
  }), drawImage("Signature", { ...origin, width: width * view.width, height: height * view.height,
    rotate: view.angle(), xSkew: degrees(0), ySkew: degrees(0) }));
  const annotation = document.context.obj({
    Type: "Annot", Subtype: "Stamp", Rect: rectangle, P: target.ref,
    F: 4 | 64 | 128, AP: { N: document.context.register(appearance) },
  });
  target.node.addAnnot(document.context.register(annotation));
  progress(80, "Adding your visible signature on this device…");
  const data = await document.save({ updateFieldAppearances: false });
  progress(100, "Your signed PDF is ready.");
  return { name: pageOutputName(job.files[0].name, "signed"), mimeType: "application/pdf", data: data.buffer };
}
