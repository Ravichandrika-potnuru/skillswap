"use client";

import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "motion/react";
import { usePathname } from "next/navigation";

const pageEaseOut = [0.16, 1, 0.3, 1];
const pageEaseIn = [0.7, 0, 0.84, 0];

export default function PortalTransitions({ children }) {
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();
  const reduceMotion = prefersReducedMotion === true;

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence initial={false} mode="wait">
        <motion.div
          key={pathname}
          className="portal-page-transition"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: reduceMotion ? 0.12 : 0.18, ease: pageEaseIn } }}
          transition={{
            opacity: { duration: reduceMotion ? 0.12 : 0.22, ease: pageEaseOut },
          }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </MotionConfig>
  );
}
