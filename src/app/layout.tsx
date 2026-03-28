import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import { FileImage, LayoutGrid } from "lucide-react";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "심재고 (心齋庫)",
  description: "A premium repository of high-quality AI prompts",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} antialiased selection:bg-white/20 bg-[#09090b]`}>
        <nav className="fixed top-0 left-0 right-0 h-16 bg-black/60 backdrop-blur-md border-b border-white/10 z-50 px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white text-black rounded-lg flex items-center justify-center font-black text-xl font-serif">心</div>
            <span className="font-bold text-lg tracking-tight hidden sm:block">심재고</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 text-sm font-medium text-neutral-400 hover:text-white transition-colors px-3 py-2 rounded-md hover:bg-white/5">
              <LayoutGrid className="w-4 h-4" />
              Prompts
            </Link>
            <Link href="/pdf-splitter" className="flex items-center gap-2 text-sm font-medium text-neutral-400 hover:text-white transition-colors px-3 py-2 rounded-md hover:bg-white/5">
              <FileImage className="w-4 h-4" />
              PDF to JPG
            </Link>
            <Link href="/scraper" className="flex items-center gap-2 text-sm font-medium text-neutral-400 hover:text-white transition-colors px-3 py-2 rounded-md hover:bg-white/5">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M2 12h20"/><path d="M5 2v20"/><path d="M19 2v20"/><path d="M2.5 7h19"/><path d="M2.5 17h19"/></svg>
              Web Scraper
            </Link>
          </div>
        </nav>
        <div className="pt-16">
          {children}
        </div>
      </body>
    </html>
  );
}
