"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 py-6 px-4">
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="mb-4 md:mb-0"
          >
            <p className="text-sm text-gray-600 dark:text-gray-400">
              © {currentYear} Everwood LLC. All rights reserved.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex space-x-6"
          >
            <Link
              href="/privacy-policy"
              className="text-sm text-gray-600 hover:text-primary dark:text-gray-400 dark:hover:text-primary transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms-of-service"
              className="text-sm text-gray-600 hover:text-primary dark:text-gray-400 dark:hover:text-primary transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              href="#"
              className="text-sm text-gray-600 hover:text-primary dark:text-gray-400 dark:hover:text-primary transition-colors"
            >
              Contact
            </Link>
          </motion.div>
        </div>
      </div>
    </footer>
  );
}
