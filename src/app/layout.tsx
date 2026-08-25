import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "미도리 일본어학원",
  description: "선생님용 출석·수강권 관리",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-white text-ink">{children}</body>
    </html>
  );
}
