'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Star, MessageSquare, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { formatDate } from '@/lib/format';
import api from '@/lib/api';

export default function ProductReviews({ productId, ratingAvg = 4.8, ratingCount = 0 }) {
  const { user, isCustomer } = useAuth();
  const toast = useToast();

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState(false);

  // Fetch Reviews
  useEffect(() => {
    async function loadReviews() {
      if (!productId) return;
      try {
        setLoading(true);
        const data = await api.get(`/api/products/${productId}/reviews`);
        if (data?.items) {
          setReviews(data.items);
        } else if (Array.isArray(data)) {
          setReviews(data);
        }
      } catch (err) {
        // Fallback or leave empty
      } finally {
        setLoading(false);
      }
    }

    loadReviews();
  }, [productId]);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess(false);

    if (!user) {
      setFormError('Vui lòng đăng nhập để gửi đánh giá.');
      return;
    }
    if (!isCustomer) {
      setFormError('Tài khoản quản trị viên không thể gửi đánh giá.');
      return;
    }

    try {
      setSubmitting(true);
      await api.post(`/api/products/${productId}/reviews`, {
        rating,
        comment: comment.trim(),
      });
      setFormSuccess(true);
      toast.success('Cảm ơn bạn đã gửi đánh giá sản phẩm!');
      setComment('');
      // Refresh reviews list
      const data = await api.get(`/api/products/${productId}/reviews`);
      if (data?.items) setReviews(data.items);
    } catch (err) {
      setFormError(err.message || 'Chỉ có thể đánh giá sau khi đơn hàng đã được giao thành công.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 sm:p-8 border border-neutral-200/80 dark:border-neutral-800 shadow-sm space-y-8">
      {/* 1. Rating Summary Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-neutral-100 dark:border-neutral-800">
        <div>
          <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-1">
            Đánh giá & Nhận xét
          </h3>
          <p className="text-xs text-neutral-500">
            Từ khách hàng đã mua và trải nghiệm sản phẩm
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-3xl font-black text-neutral-900 dark:text-white">
              {Number(ratingAvg || 4.8).toFixed(1)}
            </span>
            <span className="text-sm text-neutral-400"> / 5.0</span>
            <p className="text-xs text-neutral-500">
              {ratingCount || reviews.length} lượt đánh giá
            </p>
          </div>

          <div className="flex text-amber-400">
            {Array.from({ length: 5 }, (_, i) => (
              <Star
                key={i}
                className={`w-5 h-5 ${
                  i < Math.round(ratingAvg || 5) ? 'fill-current' : 'text-neutral-200 dark:text-neutral-700'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 2. Submit Review Form */}
      <div className="p-5 sm:p-6 rounded-2xl bg-neutral-50/70 dark:bg-neutral-800/40 border border-neutral-200/70 dark:border-neutral-800">
        <h4 className="text-sm font-bold text-neutral-900 dark:text-white mb-3">
          Viết đánh giá của bạn
        </h4>

        {formError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 text-rose-700 text-xs flex items-center gap-2 border border-rose-200">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {formSuccess && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 text-emerald-700 text-xs flex items-center gap-2 border border-emerald-200">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Đánh giá của bạn đã được ghi nhận thành công!</span>
          </div>
        )}

        {user ? (
          <form onSubmit={handleSubmitReview} className="space-y-4">
            {/* Interactive Star Rating Selector */}
            <div>
              <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5">
                Chọn số sao:
              </label>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 text-neutral-300 hover:text-amber-400 transition-colors"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        (hoverRating || rating) >= star ? 'text-amber-400 fill-current' : ''
                      }`}
                    />
                  </button>
                ))}
                <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 ml-2">
                  {rating === 5 ? 'Tuyệt vời' : rating === 4 ? 'Rất tốt' : rating === 3 ? 'Bình thường' : 'Chưa hài lòng'}
                </span>
              </div>
            </div>

            {/* Comment Textarea */}
            <div>
              <textarea
                rows={3}
                required
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Chia sẻ cảm nhận chi tiết về hiệu năng, thiết kế, pin và camera..."
                className="w-full p-3.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs sm:text-sm text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-blue"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-full bg-brand-blue hover:bg-brand-blue-hover text-white text-xs font-bold transition-all shadow-sm disabled:opacity-50"
            >
              {submitting ? 'Đang gửi...' : 'Gửi Đánh Giá'}
            </button>
          </form>
        ) : (
          <div className="text-center py-4">
            <p className="text-xs text-neutral-500 mb-3">
              Bạn cần đăng nhập tài khoản khách hàng để có thể đánh giá sản phẩm này.
            </p>
            <Link
              href="/login"
              className="inline-block px-5 py-2 rounded-full bg-brand-blue text-white text-xs font-bold hover:bg-brand-blue-hover transition-colors"
            >
              Đăng nhập ngay
            </Link>
          </div>
        )}
      </div>

      {/* 3. Existing Reviews List */}
      <div className="space-y-4">
        <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
          Nhận xét gần đây ({reviews.length})
        </h4>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 bg-neutral-100 dark:bg-neutral-800 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : reviews.length > 0 ? (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {reviews.map((rev, idx) => (
              <div key={idx} className="py-4">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-xs font-bold text-brand-blue">
                      {rev.user?.fullName?.charAt(0) || 'K'}
                    </div>
                    <span className="text-xs font-bold text-neutral-900 dark:text-white">
                      {rev.user?.fullName || 'Khách hàng ẩn danh'}
                    </span>
                  </div>
                  <span className="text-[11px] text-neutral-400">
                    {formatDate(rev.createdAt)}
                  </span>
                </div>

                <div className="flex text-amber-400 mb-2">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star
                      key={i}
                      className={`w-3.5 h-3.5 ${
                        i < rev.rating ? 'fill-current' : 'text-neutral-200 dark:text-neutral-700'
                      }`}
                    />
                  ))}
                </div>

                <p className="text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
                  {rev.comment}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-neutral-400 italic">
            Chưa có đánh giá nào cho sản phẩm này. Hãy là người đầu tiên trải nghiệm và chia sẻ nhận xét!
          </p>
        )}
      </div>
    </div>
  );
}
