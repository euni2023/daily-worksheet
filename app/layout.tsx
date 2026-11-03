import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "매일 학습지",
  description: "초등 6학년 매일 학습지: 어휘, 읽기, 쓰기, 영어",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <header className="no-print border-b border-black/10 bg-paper">
          <nav className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-lg font-bold text-brand">
              매일 학습지
            </Link>
            <Link href="/parent" className="text-sm text-muted hover:text-brand">
              엄마 화면
            </Link>
          </nav>
        </header>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
