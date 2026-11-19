import './globals.css';
import AppProviders from '@/components/providers/AppProviders';

export const metadata = {
  title: 'TechStore — Thiết bị Công nghệ Flagship',
  description: 'Điện thoại, Laptop, Phụ kiện công nghệ chính hãng',
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body className="min-h-screen flex flex-col bg-[#fafafa] text-neutral-900 antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
