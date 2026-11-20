'use client';

import { useState } from 'react';

export default function ProductGallery({ images = [], title = 'Sản phẩm' }) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // If no images provided, use a high quality default
  const displayImages = images.length > 0 
    ? images 
    : ['https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=900&q=85'];

  return (
    <div className="flex flex-col gap-4">
      {/* Main High-Res Display Frame */}
      <div className="relative aspect-square w-full rounded-3xl overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 p-8 flex items-center justify-center shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={displayImages[selectedIndex]}
          alt={`${title} - Hình ${selectedIndex + 1}`}
          className="max-w-full max-h-full object-contain transition-transform duration-300 hover:scale-110"
        />
      </div>

      {/* Thumbnails Row */}
      {displayImages.length > 1 && (
        <div className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar">
          {displayImages.map((img, idx) => {
            const isSelected = selectedIndex === idx;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedIndex(idx)}
                className={`relative w-20 h-20 rounded-2xl overflow-hidden bg-white dark:bg-neutral-900 p-2 border-2 transition-all shrink-0 ${
                  isSelected
                    ? 'border-brand-blue ring-2 ring-brand-blue/30 scale-105'
                    : 'border-neutral-200 dark:border-neutral-800 opacity-70 hover:opacity-100 hover:border-neutral-300'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img}
                  alt={`Thumbnail ${idx + 1}`}
                  className="w-full h-full object-contain"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
