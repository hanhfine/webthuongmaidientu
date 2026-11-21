'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sparkles, ArrowRight, Smartphone, Tv, Laptop, Headphones } from 'lucide-react';
import ProductCard from '@/components/product/ProductCard';
import ScrollReveal from '@/components/ui/ScrollReveal';
import api from '@/lib/api';

const HELP_CHOICES = [
  {
    title: 'Tìm điện thoại phù hợp với bạn',
    desc: 'So sánh kích thước màn hình, camera và chip AI tối ưu nhất',
    icon: Smartphone,
    href: '/products?category=dien-thoai',
  },
  {
    title: 'Khám phá sản phẩm nổi bật nhất',
    desc: 'Xem các thiết bị được đánh giá cao và lựa chọn nhiều trong tuần',
    icon: Tv,
    href: '/products?sort=rating',
  },
  {
    title: 'Tìm Laptop & Máy tính bảng làm việc',
    desc: 'Cấu hình mượt mà cho đồ họa, lập trình và sáng tạo nội dung',
    icon: Laptop,
    href: '/products?category=laptop',
  },
  {
    title: 'Chọn phụ kiện & âm thanh cá nhân',
    desc: 'Tai nghe chống ồn, đồng hồ sức khỏe và sạc nhanh công suất lớn',
    icon: Headphones,
    href: '/products?category=phu-kien',
  },
];

export default function RecommendedGrid() {
  const [recommended, setRecommended] = useState([]);

  useEffect(() => {
    async function loadRecommended() {
      try {
        const res = await api.get('/api/products?sort=rating&page=1');
        const list = res?.products || res?.items || (Array.isArray(res) ? res : []);
        if (list.length > 0) {
          setRecommended(list.slice(0, 4));
        }
      } catch (err) {
        // Fallback or leave empty
      }
    }
    loadRecommended();
  }, []);

  return (
    <section className="py-16 px-4 sm:px-6 max-w-7xl mx-auto space-y-16">
      {/* Recommended for You */}
      {recommended.length > 0 && (
        <ScrollReveal>
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-blue mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                Dành Riêng Cho Bạn
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white">
                Được đề xuất cho bạn
              </h3>
            </div>
            <Link
              href="/products"
              className="py-2 text-xs sm:text-sm font-semibold text-brand-blue hover:underline flex items-center gap-1"
            >
              Xem tất cả
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
            {recommended.map((prod) => (
              <ProductCard key={prod._id} product={prod} />
            ))}
          </div>
        </ScrollReveal>
      )}

      {/* "Giúp tôi lựa chọn" Guide Cards */}
      <ScrollReveal delay={0.15}>
        <div className="text-center mb-8">
          <h3 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white text-balance">
            Giúp tôi lựa chọn
          </h3>
          <p className="text-sm text-neutral-600 mt-1">
            Chưa chắc chắn về thiết bị phù hợp? Hãy để chúng tôi hướng dẫn bạn.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {HELP_CHOICES.map((choice, idx) => {
            const Icon = choice.icon;
            return (
              <Link
                key={idx}
                href={choice.href}
                className="group p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-brand-blue/50 dark:hover:border-brand-blue/50 hover:bg-neutral-100 transition-colors duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-brand-blue flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-bold text-neutral-900 dark:text-white group-hover:text-brand-blue transition-colors mb-2 text-balance">
                    {choice.title}
                  </h4>
                  <p className="text-xs text-neutral-600 leading-relaxed text-pretty">
                    {choice.desc}
                  </p>
                </div>
                <div className="mt-6 flex items-center text-xs font-bold text-brand-blue">
                  Tìm hiểu thêm <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </div>
              </Link>
            );
          })}
        </div>
      </ScrollReveal>
    </section>
  );
}
