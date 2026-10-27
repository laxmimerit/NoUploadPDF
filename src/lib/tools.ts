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
  // Fixed route identifier. Keep it unchanged when the display name changes.
  slug: string;
  name: string;
  description: string;
  icon: ToolIcon;
  group: "Organize" | "Convert" | "Edit" | "Optimize";
  available?: boolean;
  minimumFiles?: number;
  reorderFiles?: boolean;
};

export const tools: Tool[] = [
  {
    slug: "merge-pdf",
    name: "Merge PDF",
    description: "Bring multiple PDFs together in one file.",
    icon: "merge",
    group: "Organize",
    available: true,
    minimumFiles: 2,
    reorderFiles: true,
  },
  {
    slug: "split-pdf",
    name: "Split PDF",
    description: "Separate a PDF into smaller files.",
    icon: "split",
    group: "Organize",
  },
  {
    slug: "extract-pages",
    name: "Extract pages",
    description: "Save just the pages you need.",
    icon: "extract",
    group: "Organize",
  },
  {
    slug: "rotate-pdf",
    name: "Rotate PDF",
    description: "Turn pages to the right orientation.",
    icon: "rotate",
    group: "Organize",
  },
  {
    slug: "reorder-delete",
    name: "Reorder & delete",
    description: "Arrange or remove pages with ease.",
    icon: "organize",
    group: "Organize",
  },
  {
    slug: "images-to-pdf",
    name: "Images to PDF",
    description: "Turn your images into a single PDF.",
    icon: "image-to-pdf",
    group: "Convert",
  },
  {
    slug: "pdf-to-images",
    name: "PDF to images",
    description: "Save PDF pages as image files.",
    icon: "pdf-to-image",
    group: "Convert",
  },
  {
    slug: "page-numbers",
    name: "Page numbers",
    description: "Add clear page numbers to your PDF.",
    icon: "page-numbers",
    group: "Edit",
  },
  {
    slug: "watermark-pdf",
    name: "Watermark PDF",
    description: "Add a personal mark to your pages.",
    icon: "watermark",
    group: "Edit",
  },
  {
    slug: "sign-pdf",
    name: "Sign PDF",
    description: "Add your signature to a document.",
    icon: "sign",
    group: "Edit",
  },
  {
    slug: "compress-pdf",
    name: "Compress PDF",
    description: "Make a PDF smaller and easier to share.",
    icon: "compress",
    group: "Optimize",
  },
];

// Preserve first appearance in the registry; never maintain a separate group list.
export const toolGroups = [...new Set(tools.map((tool) => tool.group))];

export const groupedTools = toolGroups.map((group) => ({
  group,
  tools: tools.filter((tool) => tool.group === group),
}));
