import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { KeepAlive } from '@/components/keep-alive';

export const metadata: Metadata = {
  title: 'MooNTooLSTORE',
  description: 'Панель управления для MooNTooLSTORE.',
  icons: {
    icon: 'https://cdn.jsdelivr.net/gh/MooNbyt/icon-png-jpeg-MOONTOOL@835bcf98f7c541274a18e6abc4aa38aa1b754f12/icon.png.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased bg-background">
        {children}
        <Toaster />
        <KeepAlive />
      </body>
    </html>
  );
}
