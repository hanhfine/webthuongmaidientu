'use client';

import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';

export default function MegaMenu({ activeItem, onMouseEnter, onMouseLeave, onClose }) {
  if (!activeItem) return null;

  return (
    <AnimatePresence>
      <>
        <div
          onClick={onClose}
          onMouseEnter={onClose}
          className="fixed inset-x-0 top-16 sm:top-20 h-screen bg-black/25 z-20"
          aria-hidden="true"
        />
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          className="absolute top-full left-0 right-0 w-full bg-white dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 shadow-2xl z-30"
        >
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="grid grid-cols-12 gap-8">
              {/* Column 1: Featured Products with Images (Cols 1-6) */}
              <div className="col-span-12 lg:col-span-7">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xs font-semibold tracking-wider uppercase text-neutral-600 dark:text-neutral-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-brand-blue" />
                    Sản Phẩm Nổi Bật
                  </h4>
                  <Link
                    href={activeItem.href}
                    onClick={onClose}
                    className="py-1 text-xs font-semibold text-[#0066cc] hover:underline flex items-center gap-1"
                  >
                    Xem tất cả
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {activeItem.featured?.map((feat, idx) => (
                    <Link
                      key={idx}
                      href={feat.href}
                      onClick={onClose}
                      className="group flex gap-4 p-3 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors duration-200"
                    >
                      <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-neutral-200 shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={feat.image}
                          alt={feat.title}
                          className="w-full h-full object-cover"
                        />
                        {feat.tag && (
                          <span className="absolute top-1 left-1 px-1.5 py-0.5 text-xs font-semibold bg-neutral-900/90 text-white rounded">
                            {feat.tag}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col justify-center min-w-0">
                        <h5 className="text-sm font-semibold text-neutral-900 dark:text-white group-hover:text-brand-blue transition-colors line-clamp-1">
                          {feat.title}
                        </h5>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 line-clamp-2">
                          {feat.desc}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Column 2 & 3: Detailed Categories & Promotions (Cols 7-12) */}
              <div className="col-span-12 lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-6 pl-0 lg:pl-6 border-t lg:border-t-0 lg:border-l border-neutral-200 dark:border-neutral-800">
                {activeItem.sections?.map((sec, sIdx) => (
                  <div key={sIdx}>
                    <h4 className="text-xs font-semibold tracking-wider uppercase text-neutral-600 dark:text-neutral-400 mb-3">
                      {sec.title}
                    </h4>
                    <ul className="space-y-2">
                      {sec.links?.map((lnk, lIdx) => (
                        <li key={lIdx}>
                          <Link
                            href={lnk.href}
                            onClick={onClose}
                            className="text-sm text-neutral-700 dark:text-neutral-300 hover:text-brand-blue dark:hover:text-brand-blue transition-colors block py-0.5"
                          >
                            {lnk.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </>
    </AnimatePresence>
  );
}
