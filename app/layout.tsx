import "./globals.css";

export const metadata = {
  title: "드라마 LIVE",
  description: "드라마 LIVE 가계부",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
