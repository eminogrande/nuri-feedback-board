import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Nuri Feedback",
  description: "Public feedback board and roadmap for Nuri",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex min-h-screen flex-col">
          <header className="border-b border-border bg-background">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
              <Link href="/" className="text-xl font-bold text-foreground">
                Nuri Feedback
              </Link>
              <nav className="flex items-center gap-6">
                <Link
                  href="/roadmap"
                  className="text-sm font-medium text-muted hover:text-foreground transition-colors"
                >
                  Roadmap
                </Link>
                <Link
                  href="/feedback"
                  className="text-sm font-medium text-muted hover:text-foreground transition-colors"
                >
                  Give Feedback
                </Link>
              </nav>
            </div>
          </header>
          <main className="flex-1">{children}</main>
          <footer className="border-t border-border bg-background py-8">
            <div className="container mx-auto px-4 text-center text-sm text-muted">
              <p>© {new Date().getFullYear()} Nuri. All rights reserved.</p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
