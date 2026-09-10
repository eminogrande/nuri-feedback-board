import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import { SiteNavigation } from "@/components/SiteNavigation";
import { AuthProvider, HeaderAuth } from "@/components/auth";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Nuri Feedback — Help shape Nuri", template: "%s | Nuri Feedback" },
  description: "Share an idea, tell us what could work better, and explore the Nuri community roadmap.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="text-[17px] [color-scheme:light]">
      <body className={`${inter.className} antialiased`}>
        <AuthProvider>
          <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:p-4 focus:ring-2 focus:ring-violet-700">Skip to content</a>
          <div className="flex min-h-screen flex-col">
            <header className="border-b border-border bg-white">
              <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-4 sm:px-6 lg:px-8">
                <Link href="/" aria-label="Nuri Feedback home" className="flex items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-700">
                  <span className="text-3xl font-bold tracking-tight">nuri<span className="text-violet-700">.</span></span>
                  <span className="border-l border-slate-300 pl-3 text-base text-slate-600">Feedback</span>
                </Link>
                <SiteNavigation />
                <HeaderAuth />
              </div>
            </header>
            <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 focus:outline-none">{children}</main>
            <footer className="mt-8 border-t border-border py-8">
              <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
                <p>Built with your feedback. Made for everyone.</p>
                <p>Nuri community feedback</p>
              </div>
            </footer>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
