export type ToolIcon =
  | "merge"
  | "split"
  | "extract"
  | "rotate"
  | "organize"
  | "image-to-pdf"
  | "pdf-to-image"
  | "page-numbers"
  | "watermark"
  | "sign"
  | "compress";

export type Tool = {
  name: string;
  description: string;
  icon: ToolIcon;
  group: "Organize" | "Convert" | "Edit" | "Optimize";
};

export const tools: Tool[] = [
  { name: "Merge PDF", description: "Bring multiple PDFs together in one file.", icon: "merge", group: "Organize" },
  { name: "Split PDF", description: "Separate a PDF into smaller files.", icon: "split", group: "Organize" },
  { name: "Extract pages", description: "Save just the pages you need.", icon: "extract", group: "Organize" },
  { name: "Rotate PDF", description: "Turn pages to the right orientation.", icon: "rotate", group: "Organize" },
  { name: "Reorder & delete", description: "Arrange or remove pages with ease.", icon: "organize", group: "Organize" },
  { name: "Images to PDF", description: "Turn your images into a single PDF.", icon: "image-to-pdf", group: "Convert" },
  { name: "PDF to images", description: "Save PDF pages as image files.", icon: "pdf-to-image", group: "Convert" },
  { name: "Page numbers", description: "Add clear page numbers to your PDF.", icon: "page-numbers", group: "Edit" },
  { name: "Watermark PDF", description: "Add a personal mark to your pages.", icon: "watermark", group: "Edit" },
  { name: "Sign PDF", description: "Add your signature to a document.", icon: "sign", group: "Edit" },
  { name: "Compress PDF", description: "Make a PDF smaller and easier to share.", icon: "compress", group: "Optimize" },
];

export const toolGroups: Tool["group"][] = ["Organize", "Convert", "Edit", "Optimize"];
