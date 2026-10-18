import React from 'react';

export default function BrandLogo({ className = '', decorative = false }) {
  return (
    <img
      className={`brand-logo ${className}`}
      src="./brand/patilanci-smp.svg"
      alt={decorative ? '' : 'Patilanci SMP'}
      draggable="false"
    />
  );
}
