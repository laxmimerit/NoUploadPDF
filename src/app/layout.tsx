import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NoUploadPDF — Private PDF tools",
  description: "Simple PDF tools that work privately on your device. Your files never leave your computer.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
