"use client";

import { motion } from "framer-motion";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-[calc(100vh-64px)] flex flex-col justify-between"
    >
      <div className="flex-1">{children}</div>
    </motion.div>
  );
}
