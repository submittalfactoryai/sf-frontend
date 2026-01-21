import React from 'react';

export const Logo = ({ className = "h-8 w-8" }: { className?: string }) => {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="20" y="20" width="60" height="60" rx="8" className="fill-blue-600" />
      <path
        d="M35 45h30M35 55h20"
        stroke="white"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M65 65L75 75M75 65L65 75"
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
};