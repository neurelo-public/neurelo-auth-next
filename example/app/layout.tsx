import { SessionProvider } from 'neurelo-auth-next/react';
import { getAuthContext } from './context';
import './globals.css';

export const metadata = {
  title: 'Neurelo Authentication',
  description: 'Example using Neurelo Auth',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider context={getAuthContext}>{children}</SessionProvider>
      </body>
    </html>
  );
}
