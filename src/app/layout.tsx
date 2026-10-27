import type { Metadata } from "next";
import localFont from "next/font/local";
import { Suspense } from "react";
import { PageContent } from "@/components/page-content";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import "./globals.css";

const sans = localFont({
  src: "./fonts/instrument-sans.ttf", variable: "--font-instrument", display: "swap", weight: "400 600",
});
const mono = localFont({
  src: "./fonts/jetbrains-mono.ttf", variable: "--font-jetbrains", display: "swap", weight: "400 500",
});

// Apply the saved/system theme before paint, including when browser storage is unavailable.
const themeScript = `(() => {
  let theme;
  try { theme = localStorage.getItem('theme'); } catch {}
  document.documentElement.dataset.theme = theme === 'light' || theme === 'dark'
    ? theme : matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
})();`;

export const metadata: Metadata = {
  title: "NoUploadPDF — Private PDF tools",
  description: "Merge, split, arrange, number, and watermark PDF pages free in your browser. Your files stay on your device.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} h-full antialiased`} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body className="min-h-full font-sans">
        <a className="skip-link" href="#main-content">Skip to content</a>
        <SiteHeader />
        <Suspense fallback={null}><PageContent>{children}</PageContent></Suspense>
        <SiteFooter />
      </body>
    </html>
  );
}
