import React from 'react';

interface LeafIconProps {
  size?: number;
  className?: string;
}

export const LeafIcon: React.FC<LeafIconProps> = ({ size = 48, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    className={className}
  >
    {/* Stem */}
    <path
      d="M24 42 L24 24"
      stroke="#C49A3C"
      strokeWidth="1.75"
      strokeLinecap="round"
    />
    {/* Left leaf */}
    <path
      d="M24 32 C20 28 12 24 14 16 C16 10 24 16 24 32Z"
      fill="rgba(196,154,60,0.18)"
      stroke="#C49A3C"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    {/* Right leaf */}
    <path
      d="M24 28 C28 24 36 20 34 12 C32 6 24 12 24 28Z"
      fill="rgba(224,98,42,0.15)"
      stroke="#E0622A"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
);
