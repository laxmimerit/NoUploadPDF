import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

// Read visible page text with the independent preview parser after reopening the output.
export async function pageTexts(data: ArrayBuffer): Promise<string[]> {
  const loading = getDocument({ data: new Uint8Array(data), useSystemFonts: true });
  try {
    const document = await loading.promise;
    const texts = [];
    for (let number = 1; number <= document.numPages; number++) {
      const content = await (await document.getPage(number)).getTextContent();
      texts.push(content.items.map((item) => "str" in item ? item.str : "").join(" "));
    }
    return texts;
  } finally {
    await loading.destroy();
  }
}
