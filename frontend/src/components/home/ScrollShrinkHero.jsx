'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';

export default function ScrollShrinkHero() {
  const containerRef = useRef(null);

  // Track window scroll progress for smooth shrink animation
  const { scrollY } = useScroll();

  // Transforms on scroll:
  // After ~2-3 mouse wheel scrolls (160px), banner smoothly shrinks to max-w-7xl card right in front of user
  const scale = useTransform(scrollY, [0, 160], [1, 0.92]);
  // Sharp screen edges at top (0px) smoothly morph into rounded card corners (32px)
  const borderRadius = useTransform(scrollY, [0, 160], [0, 32]);
  // Ambient elevation shadow as card floats on scroll
  const shadow = useTransform(
    scrollY,
    [0, 160],
    ['0px 0px 0px rgba(0,0,0,0)', '0px 25px 60px -15px rgba(0, 0, 0, 0.85)']
  );

  return (
    <section ref={containerRef} className="relative w-full overflow-hidden bg-neutral-950 pb-12 sm:pb-20">
      <motion.div
        style={{
          scale,
          borderRadius,
          boxShadow: shadow,
          transformOrigin: 'center top',
        }}
        className="relative w-full min-h-screen flex flex-col justify-between overflow-hidden"
      >
        {/* Background Visual & Ambient Lighting (Spans 100% full width edge-to-edge) */}
        <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-slate-900 to-indigo-950 z-0">
          {/* Ambient Glow Orbs */}
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-brand-blue/25 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-purple-600/25 rounded-full blur-3xl pointer-events-none" />
          
          {/* Subtle Grid Texture */}
          <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
        </div>

        {/* Hero Content Grid (Centered within max-w-7xl) */}
        <div className="relative z-10 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center px-6 sm:px-12 lg:px-16 pt-28 sm:pt-36 pb-12 my-auto">
          {/* Left Text Column */}
          <div className="lg:col-span-7 flex flex-col justify-center text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white text-xs font-semibold uppercase tracking-wider mb-6 w-fit animate-in fade-in slide-in-from-top-4 duration-700">
              <Sparkles className="w-3.5 h-3.5 text-brand-blue" />
              Sự Kiện Công Nghệ Flagship 2026
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[1.08] mb-6">
              Bứt Phá <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-white">
                Khoảnh Khắc
              </span>
            </h1>

            <p className="text-base sm:text-xl text-neutral-300 max-w-xl font-normal leading-relaxed mb-8">
              Sẵn sàng lên đời, nâng tầm trải nghiệm cùng dòng thiết bị Galaxy AI và Flagship thế hệ mới nhất.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/products"
                className="px-8 py-4 rounded-full bg-brand-blue hover:bg-brand-blue-hover text-white text-sm font-bold tracking-wide shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 hover:scale-105 transition-all duration-300 flex items-center gap-2 group"
              >
                Khám Phá Ngay
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/products?category=dien-thoai"
                className="px-8 py-4 rounded-full bg-white/10 hover:bg-white/15 backdrop-blur-md text-white text-sm font-semibold border border-white/20 hover:border-white/40 transition-all duration-300"
              >
                Xem Dòng Galaxy
              </Link>
            </div>
          </div>

          {/* Right Visual Image Column */}
          <div className="lg:col-span-5 flex justify-center items-center relative">
            <div className="relative w-full max-w-md aspect-square flex items-center justify-center">
              {/* Device Mockup Display */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800&q=85"
                alt="Galaxy Flagship Showcase"
                className="w-full h-full object-contain filter drop-shadow-[0_25px_35px_rgba(0,113,227,0.35)] hover:scale-105 transition-transform duration-500"
              />
            </div>
          </div>
        </div>

        {/* Bottom Feature Badges Bar */}
        <div className="relative z-10 border-t border-white/10 bg-black/40 backdrop-blur-md py-4 px-6 sm:px-12 w-full">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 text-xs text-neutral-300">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Thu Cũ Đổi Mới: Trợ giá tới 8.000.000 ₫</span>
            </div>
            <div className="hidden sm:block">
              <span>Bảo Hành VIP Care+ Toàn Diện</span>
            </div>
            <div>
              <span>Trả Góp 0% Lãi Suất Tới 24 Tháng</span>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
