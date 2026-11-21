'use client';

import Link from 'next/link';
import ScrollReveal from '@/components/ui/ScrollReveal';

const STORIES = [
  {
    tag: 'Galaxy AI Flagship',
    title: 'Bứt phá khoảnh khắc\nbật lên chất riêng',
    desc: 'Đâu là chiếc flagship chuẩn gu sống và nâng tầm phong cách làm việc của bạn?',
    primaryBtn: { label: 'Mua S26 Ultra', href: '/products?category=dien-thoai' },
    secondaryBtn: { label: 'Mua Z Fold8', href: '/products?category=dien-thoai' },
    bgGradient: 'from-purple-950/80 via-slate-900 to-neutral-950',
    heroImage: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=900&q=85',
    subItems: [
      { name: 'Galaxy Z Fold8', image: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=300&q=80', href: '/products?category=dien-thoai' },
      { name: 'Galaxy Z Flip8', image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=300&q=80', href: '/products?category=dien-thoai' },
      { name: 'Galaxy Tab S Ultra', image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=300&q=80', href: '/products?category=laptop' },
      { name: 'Galaxy S26 FE', image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300&q=80', href: '/products?category=dien-thoai' },
    ],
  },
  {
    tag: 'Âm Thanh & Ngoại Vi',
    title: 'Làm việc mượt mà\nvượt xa giới hạn',
    desc: 'Trọn bộ bàn phím cơ, chuột công thái học và âm thanh chống ồn giúp tập trung tối đa mỗi ngày.',
    primaryBtn: { label: 'Xem Laptop', href: '/products?category=laptop' },
    secondaryBtn: { label: 'Xem Phụ Kiện', href: '/products?category=phu-kien' },
    bgGradient: 'from-emerald-950/80 via-slate-900 to-neutral-950',
    heroImage: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=900&q=85',
    subItems: [
      { name: 'MacBook Air M3', image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300&q=80', href: '/products?category=laptop&brand=Apple' },
      { name: 'Bàn Phím Keychron', image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=300&q=80', href: '/products?category=phu-kien&q=Keychron' },
      { name: 'Tai Nghe AirPods', image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=300&q=80', href: '/products?category=phu-kien&q=AirPods' },
      { name: 'Laptop Doanh Nhân', image: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=300&q=80', href: '/products?category=laptop' },
    ],
  },
];

export default function FeatureStory() {
  return (
    <section className="py-12 space-y-16 max-w-7xl mx-auto px-4 sm:px-6">
      {STORIES.map((story, idx) => (
        <ScrollReveal key={idx} delay={0.1}>
          <div className="rounded-3xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xl">
            {/* Main Big Feature Banner */}
            <div className={`relative p-8 sm:p-12 lg:p-16 bg-gradient-to-br ${story.bgGradient} text-white`}>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-6 space-y-4">
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/20 backdrop-blur-md">
                    {story.tag}
                  </span>
                  <h3 className="text-3xl sm:text-5xl font-black tracking-tight whitespace-pre-line leading-tight">
                    {story.title}
                  </h3>
                  <p className="text-neutral-300 text-sm sm:text-base max-w-md">
                    {story.desc}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 pt-4">
                    <Link
                      href={story.primaryBtn.href}
                      className="px-6 py-2.5 rounded-full bg-white text-neutral-900 text-xs sm:text-sm font-bold hover:bg-neutral-200 transition-colors shadow-md"
                    >
                      {story.primaryBtn.label}
                    </Link>
                    <Link
                      href={story.secondaryBtn.href}
                      className="px-6 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-semibold border border-white/20 transition-colors"
                    >
                      {story.secondaryBtn.label}
                    </Link>
                  </div>
                </div>

                <div className="lg:col-span-6 flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={story.heroImage}
                    alt={story.title}
                    className="max-h-72 sm:max-h-96 object-contain drop-shadow-2xl"
                  />
                </div>
              </div>
            </div>

            {/* 4-Item Sub-cards Grid Underneath */}
            <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-neutral-100 dark:divide-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/60">
              {story.subItems.map((sub, sIdx) => (
                <Link
                  key={sIdx}
                  href={sub.href}
                  className="p-6 flex flex-col items-center text-center group hover:bg-neutral-100 dark:hover:bg-neutral-800/80 transition-colors duration-200"
                >
                  <div className="w-24 h-24 mb-3 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={sub.image}
                      alt={sub.name}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-neutral-800 dark:text-neutral-200 group-hover:text-brand-blue transition-colors text-balance">
                    {sub.name}
                  </h4>
                </Link>
              ))}
            </div>
          </div>
        </ScrollReveal>
      ))}
    </section>
  );
}
