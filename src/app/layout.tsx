import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "NoUploadPDF — Private PDF tools",
  description: "Free PDF tools being built for your browser, without uploads. All tools are coming soon.",
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
