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
  options?: "page-ranges" | "page-grid" | "page-numbers" | "watermark" | "signature" | "compress";
  actionLabel?: string;
  maxFiles?: number;
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
    available: true,
    options: "page-ranges",
    maxFiles: 1,
    name: "Split PDF",
    description: "Separate a PDF into smaller files.",
    icon: "split",
    group: "Organize",
  },
  {
    slug: "extract-pages",
    available: true,
    options: "page-ranges",
    maxFiles: 1,
    name: "Extract pages",
    description: "Save just the pages you need.",
    icon: "extract",
    group: "Organize",
  },
  {
    slug: "rotate-pdf",
    available: true,
    options: "page-grid",
    maxFiles: 1,
    actionLabel: "Save rotated PDF",
    name: "Rotate PDF",
    description: "Turn pages to the right orientation.",
    icon: "rotate",
    group: "Organize",
  },
  {
    slug: "reorder-delete",
    available: true,
    options: "page-grid",
    maxFiles: 1,
    actionLabel: "Save PDF",
    name: "Reorder & delete",
    description: "Arrange or remove pages with ease.",
    icon: "organize",
    group: "Organize",
  },
  {
    slug: "images-to-pdf",
    available: true,
    reorderFiles: true,
    actionLabel: "Create PDF",
    name: "Images to PDF",
    description: "Turn your images into a single PDF.",
    icon: "image-to-pdf",
    group: "Convert",
  },
  {
    slug: "pdf-to-images",
    available: true,
    maxFiles: 1,
    actionLabel: "Create images",
    name: "PDF to images",
    description: "Save PDF pages as image files.",
    icon: "pdf-to-image",
    group: "Convert",
  },
  {
    slug: "page-numbers",
    available: true,
    options: "page-numbers",
    maxFiles: 1,
    actionLabel: "Save numbered PDF",
    name: "Page numbers",
    description: "Add clear page numbers to your PDF.",
    icon: "page-numbers",
    group: "Edit",
  },
  {
    slug: "watermark-pdf",
    available: true,
    options: "watermark",
    maxFiles: 1,
    actionLabel: "Save watermarked PDF",
    name: "Watermark PDF",
    description: "Add a personal mark to your pages.",
    icon: "watermark",
    group: "Edit",
  },
  {
    slug: "sign-pdf",
    options: "signature",
    maxFiles: 1,
    actionLabel: "Save signed PDF",
    name: "Sign PDF",
    description: "Add your signature to a document.",
    icon: "sign",
    group: "Edit",
  },
  {
    slug: "compress-pdf",
    available: true,
    options: "compress",
    maxFiles: 1,
    actionLabel: "Clean up PDF",
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
