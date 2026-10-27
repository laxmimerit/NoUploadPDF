import { getDocument, OPS } from "pdfjs-dist/legacy/build/pdf.mjs";

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

// Positions are in the visible page's top-left coordinate system, after crop and rotation.
export async function visibleTextItems(data: ArrayBuffer) {
  const loading = getDocument({ data: new Uint8Array(data), useSystemFonts: true });
  try {
    const document = await loading.promise;
    const pages = [];
    for (let number = 1; number <= document.numPages; number++) {
      const page = await document.getPage(number);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      const [a, b, c, d, e, f] = viewport.transform;
      const items = content.items.flatMap((item) => {
        if (!("str" in item)) return [];
        const [ta, tb, , , x, y] = item.transform;
        return [{ text: item.str, x: a * x + c * y + e, y: b * x + d * y + f,
          dx: a * ta + c * tb, dy: b * ta + d * tb, width: item.width, height: item.height }];
      });
      const operators = await page.getOperatorList();
      const fillOpacities: number[] = [];
      operators.fnArray.forEach((operation, index) => {
        if (operation !== OPS.setGState) return;
        for (const [name, value] of operators.argsArray[index][0]) {
          if (name === "ca") fillOpacities.push(value);
        }
      });
      pages.push({ width: viewport.width, height: viewport.height, items, fillOpacities });
    }
    return pages;
  } finally {
    await loading.destroy();
  }
}
