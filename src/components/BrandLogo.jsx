import React from 'react';

export default function BrandLogo({ className = '', decorative = false }) {
  return (
    <img
      className={`brand-logo ${className}`}
      src="./brand/patilanci-monogram.svg"
      alt={decorative ? '' : 'Патиланци'}
      draggable="false"
    />
  );
}
