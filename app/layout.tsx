import "./globals.css";

export const metadata = {
  title: "드라마 LIVE",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
