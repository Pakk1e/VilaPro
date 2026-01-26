import React from "react";

const IconWrapper = ({ children }) => (
  <svg
    width="64"
    height="64"
    viewBox="-8 -8 80 80"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="text-slate-800 overflow-visible"
  >
    {children}
  </svg>
);

export const Sun = () => (
  <IconWrapper>
    <circle cx="32" cy="32" r="12" />
    {[...Array(8)].map((_, i) => (
      <line
        key={i}
        x1="32"
        y1="4"
        x2="32"
        y2="12"
        transform={`rotate(${i * 45} 32 32)`}
      />
    ))}
  </IconWrapper>
);

export const Cloud = () => (
  <IconWrapper>
    <path d="M20 42h22a10 10 0 0 0 0-20 14 14 0 0 0-28 4A8 8 0 0 0 20 42z" />
  </IconWrapper>
);

export const CloudSun = () => (
  <IconWrapper>
    <circle cx="22" cy="22" r="8" />
    <path d="M26 42h18a8 8 0 0 0 0-16 12 12 0 0 0-22 4" />
  </IconWrapper>
);

export const Rain = () => (
  <IconWrapper>
    <path d="M20 40h22a10 10 0 0 0 0-20 14 14 0 0 0-28 4" />
    <line x1="24" y1="44" x2="24" y2="52" />
    <line x1="32" y1="44" x2="32" y2="52" />
    <line x1="40" y1="44" x2="40" y2="52" />
  </IconWrapper>
);

export const Snow = () => (
  <IconWrapper>
    <path d="M20 38h22a10 10 0 0 0 0-20 14 14 0 0 0-28 4" />
    <circle cx="24" cy="48" r="1.5" />
    <circle cx="32" cy="52" r="1.5" />
    <circle cx="40" cy="48" r="1.5" />
  </IconWrapper>
);

export function WeatherIcon({ code }) {
  if (code === 0) return <Sun />;
  if ([1, 2].includes(code)) return <CloudSun />;
  if (code === 3) return <Cloud />;
  if ([61, 63, 65, 80, 81, 82].includes(code)) return <Rain />;
  if ([71, 73, 75].includes(code)) return <Snow />;
  return <Cloud />;
}
