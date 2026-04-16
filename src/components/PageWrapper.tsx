import React from 'react';
import { motion } from 'motion/react';
import { useLocation } from 'react-router-dom';

export default function PageWrapper({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  return (
    <motion.div
      key={location.pathname}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="min-h-screen flex flex-col"
    >
      {children}
    </motion.div>
  );
}
