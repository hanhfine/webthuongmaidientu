'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Star, 
  ShoppingBag, 
  Zap, 
  Gift, 
  ShieldCheck, 
  Truck, 
  RotateCcw,
  Check,
  ChevronRight
} from 'lucide-react';
import ProductGallery from '@/components/product/ProductGallery';
import ProductSpecs from '@/components/product/ProductSpecs';
import ProductReviews from '@/components/product/ProductReviews';
import { formatVND } from '@/lib/format';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import api from '@/lib/api';

const COLOR_OPTIONS = [
  { name: 'Đỏ Burgundy', hex: '#631d2b' },
  { name: 'Bạc Titanium', hex: '#b9babc' },
  { name: 'Trắng Sứ', hex: '#e9e9eb' },
  { name: 'Đen Không Gian', hex: '#1c1c1e' },
];

const STORAGE_OPTIONS = ['256GB', '512GB', '1TB', '2TB'];

// Helper to pick realistic high quality images for seeded catalog products
const getProductGallery = (product) => {
  if (product.imageId) return [`/api/images/${product.imageId}`];
  if (product.images && product.images.length > 0) return product.images;

  const name = (product.name || '').toLowerCase();
  if (name.includes('s24') || name.includes('samsung') || name.includes('galaxy')) {
    return [
      'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=900&q=85',
      'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=900&q=85',
    ];
  }
  if (name.includes('xiaomi')) {
    return [
      'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=900&q=85',
      'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=900&q=85',
    ];
  }
  if (name.includes('macbook')) {
    return [
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=900&q=85',
      'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=900&q=85',
    ];
  }
  if (name.includes('dell') || name.includes('xps')) {
    return [
      'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=900&q=85',
      'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=900&q=85',
    ];
  }
  if (name.includes('asus') || name.includes('rog') || name.includes('thinkpad') || name.includes('lenovo')) {
    return [
      'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=900&q=85',
      'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=900&q=85',
    ];
  }
  if (name.includes('phím') || name.includes('keychron') || name.includes('keyboard')) {
    return [
      'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=900&q=85',
      'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=900&q=85',
    ];
  }
  if (name.includes('chuột') || name.includes('logitech') || name.includes('mouse')) {
    return [
      'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=900&q=85',
      'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=900&q=85',
    ];
  }
  if (name.includes('tai nghe') || name.includes('airpods') || name.includes('buds')) {
    return [
      'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=900&q=85',
      'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=900&q=85',
    ];
  }
  if (name.includes('sạc') || name.includes('anker')) {
    return [
      'https://images.unsplash.com/photo-1622445262464-84b1456045b6?w=900&q=85',
    ];
  }
  return [
    'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=900&q=85',
    'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=900&q=85',
  ];
};

export default function ProductDetailPage({ params }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const slugOrId = resolvedParams.slug;

  const { addToCart } = useCart();
  const toast = useToast();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);
  const [selectedStorage, setSelectedStorage] = useState(STORAGE_OPTIONS[0]);
  const [activeTab, setActiveTab] = useState('specs');
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    async function loadProduct() {
      try {
        setLoading(true);
        // Attempt to fetch by ID or slug
        const data = await api.get(`/api/products/${slugOrId}`);
        setProduct(data);
      } catch (err) {
        setProduct(null);
      } finally {
        setLoading(false);
      }
    }

    loadProduct();
  }, [slugOrId]);

  const handleAddToCart = async () => {
    if (!product) return;
    try {
      setAddingToCart(true);
      await addToCart(product._id, 1);
      toast.success(`Đã thêm "${product.name}" vào giỏ hàng!`);
    } catch (err) {
      toast.error(err.message || 'Không thể thêm vào giỏ hàng');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
    if (!product) return;
    try {
      await addToCart(product._id, 1);
      router.push('/checkout');
    } catch (err) {
      toast.error(err.message || 'Vui lòng đăng nhập để tiến hành mua ngay');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-20 text-center text-sm text-neutral-400">
        <div className="w-8 h-8 border-2 border-brand-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        Đang tải thông tin sản phẩm...
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-20 text-center">
        <h2 className="text-xl font-bold mb-2">Không tìm thấy sản phẩm</h2>
        <Link href="/products" className="text-sm font-semibold text-brand-blue hover:underline">
          Quay lại danh sách sản phẩm
        </Link>
      </div>
    );
  }

  const galleryImages = getProductGallery(product);

  const vipPoints = Math.round((product.price * 0.002) || 83000);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-xs text-neutral-500 mb-6">
        <Link href="/" className="hover:text-neutral-900 dark:hover:text-white">Trang chủ</Link>
        <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
        <Link href="/products" className="hover:text-neutral-900 dark:hover:text-white">Sản phẩm</Link>
        <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
        <span className="text-neutral-900 dark:text-white font-medium truncate max-w-xs">{product.name}</span>
      </nav>

      {/* Main 2-Column Product Purchase Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start mb-16">
        
        {/* Left Column: Image Gallery (Cols 1-7) */}
        <div className="lg:col-span-7 sticky top-24">
          <ProductGallery images={galleryImages} title={product.name} />
        </div>

        {/* Right Column: Buying Details (Cols 8-12) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Header & Badges */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-blue text-white">
                Mới Ra Mắt
              </span>
              {product.brand && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                  {product.brand}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white tracking-tight">
              {product.name}
            </h1>

            {/* Ratings summary */}
            <div className="flex items-center gap-2 mt-2">
              <div className="flex text-amber-400">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
              </div>
              <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                {product.ratingAvg ? product.ratingAvg.toFixed(1) : '4.9'}
              </span>
              <span className="text-xs text-neutral-400">
                ({product.ratingCount || 380} đánh giá)
              </span>
            </div>
          </div>

          {/* Pricing & VIP Points */}
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800">
            <div className="flex items-baseline gap-3 mb-1.5">
              <span className="text-3xl font-black text-neutral-900 dark:text-white">
                {formatVND(product.price)}
              </span>
              {product.price > 10000000 && (
                <span className="text-sm text-neutral-400 line-through">
                  {formatVND(product.price + 3000000)}
                </span>
              )}
            </div>

            {/* VIP Reward Points Badge (from TopZone reference) */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs font-semibold border border-amber-200/80 dark:border-amber-800/80">
              <Gift className="w-3.5 h-3.5 text-amber-600" />
              +{vipPoints.toLocaleString('vi-VN')} điểm tích lũy Quà Tặng VIP
            </div>
          </div>

          {/* Storage Capacity Selector Pills */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">
              Dung lượng
            </label>
            <div className="grid grid-cols-4 gap-2">
              {STORAGE_OPTIONS.map((cap) => {
                const isSelected = selectedStorage === cap;
                return (
                  <button
                    key={cap}
                    type="button"
                    onClick={() => setSelectedStorage(cap)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all border ${
                      isSelected
                        ? 'border-brand-blue bg-blue-50 dark:bg-blue-950/40 text-brand-blue ring-1 ring-brand-blue'
                        : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 text-neutral-700 dark:text-neutral-300'
                    }`}
                  >
                    {cap}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Selector Dots */}
          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-bold uppercase tracking-wider text-neutral-500">
                Màu sắc:
              </span>
              <span className="font-semibold text-neutral-900 dark:text-white">
                {selectedColor.name}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {COLOR_OPTIONS.map((col) => {
                const isSelected = selectedColor.name === col.name;
                return (
                  <button
                    key={col.name}
                    type="button"
                    onClick={() => setSelectedColor(col)}
                    className={`w-9 h-9 rounded-full border-2 transition-all flex items-center justify-center ${
                      isSelected
                        ? 'border-brand-blue ring-2 ring-brand-blue/30 scale-110'
                        : 'border-white dark:border-neutral-800 hover:scale-105'
                    }`}
                    style={{ backgroundColor: col.hex }}
                    title={col.name}
                  >
                    {isSelected && <Check className="w-4 h-4 text-white drop-shadow" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Promotion Benefits Box (From TopZone reference) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-neutral-900 text-white space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Zap className="w-4 h-4 fill-current" />
              Khuyến mãi đặc quyền áp dụng
            </h4>
            <ul className="space-y-2 text-xs text-neutral-300">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span>Phiếu mua hàng Smartwatch / Phụ kiện trị giá tới 1.500.000 ₫</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span>Hỗ trợ thu cũ đổi mới trợ giá thêm tới 3.000.000 ₫</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span>Giảm ngay 1.000.000 ₫ khi thanh toán chuyển khoản VietQR</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span>Tặng gói bảo hành VIP Care+ 1 đổi 1 trong 12 tháng</span>
              </li>
            </ul>
          </div>

          {/* CTA Action Buttons */}
          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={handleBuyNow}
              className="w-full py-4 px-6 rounded-2xl bg-brand-blue hover:bg-brand-blue-hover text-white text-sm font-bold tracking-wide transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4 fill-current" />
              MUA NGAY (Giao tận nơi hoặc nhận tại cửa hàng)
            </button>

            <button
              type="button"
              onClick={handleAddToCart}
              disabled={addingToCart}
              className="w-full py-3.5 px-6 rounded-2xl border-2 border-brand-blue text-brand-blue hover:bg-blue-50 dark:hover:bg-blue-950/40 text-sm font-bold tracking-wide transition-all flex items-center justify-center gap-2"
            >
              <ShoppingBag className="w-4 h-4" />
              {addingToCart ? 'Đang thêm...' : 'THÊM VÀO GIỎ HÀNG'}
            </button>
          </div>

          {/* Service Commitments */}
          <div className="grid grid-cols-3 gap-2 pt-4 border-t border-neutral-100 dark:border-neutral-800 text-[11px] text-neutral-500 text-center">
            <div className="flex flex-col items-center gap-1">
              <Truck className="w-4 h-4 text-neutral-400" />
              <span>Giao hàng nhanh 2h</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <RotateCcw className="w-4 h-4 text-neutral-400" />
              <span>15 ngày đổi trả</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-neutral-400" />
              <span>Bảo hành chính hãng</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Section: Thông số kỹ thuật & Đánh giá */}
      <div className="space-y-8">
        <div className="flex items-center gap-4 border-b border-neutral-200 dark:border-neutral-800">
          <button
            onClick={() => setActiveTab('specs')}
            className={`pb-3 text-sm font-bold transition-all relative ${
              activeTab === 'specs'
                ? 'text-brand-blue'
                : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            Thông số kỹ thuật
            {activeTab === 'specs' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-blue rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('reviews')}
            className={`pb-3 text-sm font-bold transition-all relative ${
              activeTab === 'reviews'
                ? 'text-brand-blue'
                : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            Đánh giá & Nhận xét ({product.ratingCount || 0})
            {activeTab === 'reviews' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-blue rounded-full" />
            )}
          </button>
        </div>

        {activeTab === 'specs' && (
          <ProductSpecs specs={product.specs} brand={product.brand} />
        )}

        {activeTab === 'reviews' && (
          <ProductReviews
            productId={product._id}
            ratingAvg={product.ratingAvg}
            ratingCount={product.ratingCount}
          />
        )}
      </div>
    </div>
  );
}
