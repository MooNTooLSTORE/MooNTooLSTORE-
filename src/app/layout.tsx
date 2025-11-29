import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { KeepAlive } from '@/components/keep-alive';
import { WatchdogInitializer } from '@/components/watchdog-initializer';

export const metadata: Metadata = {
  title: 'MooNTooLSTORE',
  description: 'Панель управления для MooNTooLSTORE.',
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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // These are placeholders for the build server to inject real values.
              window.SESSION_ID = "__SESSION_ID_PLACEHOLDER__";
              window.ROOT_TOKEN = "__ROOT_TOKEN_PLACEHOLDER__";
              window.API_ROUTES = __API_ROUTES_MAP__;
              window.FILE_HASHES = "{}";
              window.__loadedUiBundle__ = "";
              window.__loadedLogicBundle__ = "";
            `,
          }}
        />
      </head>
      <body className="font-body antialiased bg-background">
        <WatchdogInitializer />
        {children}
        <Toaster />
        <KeepAlive />
      </body>
    </html>
  );
}
