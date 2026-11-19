export default function HomePage() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-green-soft text-brand-green text-sm font-medium mb-4">
        <span className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
        TechStore Frontend Initialized
      </div>
      <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-neutral-900 mb-4">
        Khởi tạo hệ thống bán hàng Flagship
      </h1>
      <p className="text-neutral-600 max-w-xl text-lg">
        Next.js 15 App Router + Tailwind CSS + Framer Motion đã sẵn sàng kết nối API Backend cổng 4000.
      </p>
    </main>
  );
}
