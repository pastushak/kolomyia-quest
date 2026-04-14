import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Квест-карта Коломиї',
  description: 'Інтерактивна пішохідна квест-карта містом Коломия',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uk">
      <body suppressHydrationWarning className="bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}