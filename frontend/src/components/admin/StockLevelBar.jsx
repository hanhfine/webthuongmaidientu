export default function StockLevelBar({ stock = 0, threshold = 10 }) {
  // Determine health level
  const isOutOfStock = stock <= 0;
  const isLowStock = stock > 0 && stock <= threshold;

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
              : 'bg-brand-green-light'
          }`}
          style={{ width: `${Math.max(percentage, isOutOfStock ? 0 : 15)}%` }}
        />
      </div>
      <p className="text-xs leading-tight whitespace-nowrap">
        {isOutOfStock ? (
          <span className="text-red-700 font-semibold">Hết hàng</span>
        ) : isLowStock ? (
          <span className="text-amber-700 font-semibold">Cần nhập sớm</span>
        ) : (
          <span className="text-brand-green-light font-semibold">Mức an toàn</span>
        )}
      </p>
    </div>
  );
}
