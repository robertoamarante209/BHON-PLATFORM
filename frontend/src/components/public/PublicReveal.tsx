import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
export function PublicReveal({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const reduced = useReducedMotion();
  return <motion.div className={className} initial={reduced ? false : { opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.08 }} transition={{ duration: 0.65, delay, ease: [0.25, 0.46, 0.45, 0.94] }}>{children}</motion.div>;
}

