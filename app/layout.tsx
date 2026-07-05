import './globals.css';

export const metadata = { title: '안다미로 직원관리 V11', description: 'Andamiro Staff Management' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="ko"><body>{children}</body></html>;
}
