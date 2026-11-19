'use client';

import { usePathname } from 'next/navigation';
import Header from './Header';
import Footer from './Footer';

export default function LayoutShell({ children }) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith('/admin');

  if (isAdminRoute) {
    return <main className="flex-1 flex flex-col min-h-screen bg-[#f8f9fa]">{children}</main>;
  }

  return (
    <>
      <Header />
      <div className="flex-1 flex flex-col">{children}</div>
      <Footer />
    </>
  );
}
