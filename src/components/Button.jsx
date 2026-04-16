import React from 'react';

export function Button({ variant = 'primary', className = '', children, ...props }) {
  const baseClass = variant === 'primary' ? 'btn-primary' : 'btn-secondary';
  return (
    <button className={`${baseClass} ${className}`} {...props}>
      {children}
    </button>
  );
}
