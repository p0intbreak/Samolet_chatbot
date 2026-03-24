import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'Samolyot Finder',
  description: 'Conversational property search for Samolet Group projects'
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}

