import type { Transition, Variants } from 'framer-motion';

// Motion tokens from MASTER.md.
export const spring: Transition = { type: 'spring', stiffness: 420, damping: 34 };
export const ease = [0.2, 0.8, 0.2, 1] as const;
export const STAGGER = 0.035;

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.24, ease } },
};

export const listVariants: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: STAGGER } },
};

export const itemVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.24, ease } },
  exit: { opacity: 0, scale: 0.98, transition: { duration: 0.16, ease } },
};
