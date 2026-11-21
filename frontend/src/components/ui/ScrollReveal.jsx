'use client';

import { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export default function ScrollReveal({ 
  children, 
  delay = 0, 
  duration = 0.6, 
  yOffset = 36, 
  className = '' 
}) {
  const [mounted, setMounted] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    setMounted(true);
  }, []);

  // During SSR and initial client hydration, render standard markup to prevent React hydration mismatch
  if (!mounted) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: Math.min(yOffset, 24) }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 'some' }}
      transition={{ 
        duration: prefersReducedMotion ? 0 : duration, 
        delay: prefersReducedMotion ? 0 : delay, 
        ease: [0.21, 0.47, 0.32, 0.98] 
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
