import React from 'react';

export default function Footer({ className = "" }) {
  return (
    <footer className={`w-full text-center text-sm text-gray-500 print:hidden ${className}`}>
      <p className="text-balance leading-relaxed">
        Dibuat dan dikembangkan oleh Self Finder Teams &copy; 2025
      </p>
    </footer>
  );
}
