import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "NoUploadPDF — Private PDF tools",
  description: "Merge, split, and extract PDF pages free in your browser. Your files stay on your device.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full font-sans">
        <a className="skip-link" href="#main-content">Skip to content</a>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
