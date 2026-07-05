import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "드라마 가계부",
  description: "7080 라이브 드라마 전용 마감 가계부"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
