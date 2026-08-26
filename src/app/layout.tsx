import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ゆかり日本語教室",
  description: "先生用 出席・受講パス管理",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-white text-ink">{children}</body>
    </html>
  );
}
