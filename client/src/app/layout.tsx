import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Classroom Management Portal',
  description: 'Real-time classroom management tool for instructors and students.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased text-slate-900 bg-slate-50 min-h-screen">
        {children}
      </body>
    </html>
  );
}
