export default function StockLevelBar({ stock = 0, threshold = 10 }) {
  // Determine health level
  const isOutOfStock = stock <= 0;
  const isLowStock = stock > 0 && stock <= threshold;
  const isHealthy = stock > threshold;

  // Percentage for the bar (capped at 100%)
  const percentage = isOutOfStock ? 0 : Math.min(100, Math.round((stock / (threshold * 3)) * 100));

  return (
    <div className="w-full max-w-[140px] space-y-1">
      <div className="h-2 w-full rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isOutOfStock
              ? 'bg-neutral-300'
              : isLowStock
              ? 'bg-amber-500'
              : 'bg-[#2d6a4f]'
          }`}
          style={{ width: `${Math.max(percentage, isOutOfStock ? 0 : 15)}%` }}
        />
      </div>
      <p className="text-[10px] text-neutral-500 leading-tight">
        {isOutOfStock ? (
          <span className="text-rose-600 font-semibold">Hết hàng</span>
        ) : isLowStock ? (
          <span className="text-amber-600 font-semibold">Cần nhập sớm</span>
        ) : (
          <span className="text-[#2d6a4f] font-semibold">Mức an toàn</span>
        )}
      </p>
    </div>
  );
}
