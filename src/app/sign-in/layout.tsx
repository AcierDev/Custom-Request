"use client";

import { motion } from "framer-motion";

export default function SignInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gradient-to-b from-background to-muted/30 dark:from-gray-950 dark:to-gray-900"
    >
      {children}
    </motion.div>
  );
}
