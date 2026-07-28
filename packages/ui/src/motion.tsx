"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";
import { motion as motionTokens } from "./tokens";

type FadeInProps = HTMLMotionProps<"div"> & {
  children: ReactNode;
  delay?: number;
};

export function FadeIn({ children, delay = 0, ...rest }: FadeInProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: motionTokens.durationMs / 1000, ease: motionTokens.ease, delay }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function Pressable({ children, ...rest }: FadeInProps) {
  return (
    <motion.div whileTap={{ scale: 0.97 }} whileHover={{ scale: 1.01 }} transition={motionTokens.spring} {...rest}>
      {children}
    </motion.div>
  );
}

export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: motionTokens.durationMs / 1000, ease: motionTokens.ease }}
    >
      {children}
    </motion.div>
  );
}
