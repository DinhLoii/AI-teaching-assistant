'use client'

import * as React from 'react'

/**
 * Standard geometric SVG flag of Vietnam (Cờ đỏ sao vàng)
 */
export function VietnamFlag({ className = 'w-5 h-3.5' }: { className?: string }) {
  return (
    <svg
      className={`shrink-0 rounded-[3px] shadow-xs object-cover overflow-hidden ring-1 ring-black/5 dark:ring-white/10 ${className}`}
      viewBox="0 0 30 20"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Cờ Việt Nam"
    >
      <rect width="30" height="20" fill="#DA251D" />
      {/* Geometrically accurate 5-point yellow star */}
      <polygon
        fill="#FFFF00"
        points="15,3.6 16.65,8.68 22,8.68 17.67,11.82 19.33,16.9 15,13.76 10.67,16.9 12.33,11.82 8,8.68 13.35,8.68"
      />
    </svg>
  )
}

/**
 * Standard SVG flag of the United States (Cờ Mỹ)
 */
export function UsaFlag({ className = 'w-5 h-3.5' }: { className?: string }) {
  return (
    <svg
      className={`shrink-0 rounded-[3px] shadow-xs object-cover overflow-hidden ring-1 ring-black/5 dark:ring-white/10 ${className}`}
      viewBox="0 0 30 20"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Cờ Mỹ"
    >
      <defs>
        <g id="us-star">
          <polygon
            points="0,-0.65 0.19,-0.2 0.65,-0.2 0.28,0.07 0.42,0.52 0,0.24 -0.42,0.52 -0.28,0.07 -0.65,-0.2 -0.19,-0.2"
            fill="#FFFFFF"
          />
        </g>
      </defs>

      {/* 13 alternating stripes */}
      <rect width="30" height="20" fill="#B22234" />
      <rect y="1.54" width="30" height="1.54" fill="#FFFFFF" />
      <rect y="4.62" width="30" height="1.54" fill="#FFFFFF" />
      <rect y="7.69" width="30" height="1.54" fill="#FFFFFF" />
      <rect y="10.77" width="30" height="1.54" fill="#FFFFFF" />
      <rect y="13.85" width="30" height="1.54" fill="#FFFFFF" />
      <rect y="16.92" width="30" height="1.54" fill="#FFFFFF" />

      {/* Canton: blue rectangle */}
      <rect width="12" height="10.77" fill="#3C3B6E" />

      {/* Grid of stars in canton */}
      <g>
        {/* Row 1 */}
        <use href="#us-star" x="2.0" y="1.8" />
        <use href="#us-star" x="4.5" y="1.8" />
        <use href="#us-star" x="7.0" y="1.8" />
        <use href="#us-star" x="9.5" y="1.8" />

        {/* Row 2 */}
        <use href="#us-star" x="3.25" y="3.6" />
        <use href="#us-star" x="5.75" y="3.6" />
        <use href="#us-star" x="8.25" y="3.6" />

        {/* Row 3 */}
        <use href="#us-star" x="2.0" y="5.4" />
        <use href="#us-star" x="4.5" y="5.4" />
        <use href="#us-star" x="7.0" y="5.4" />
        <use href="#us-star" x="9.5" y="5.4" />

        {/* Row 4 */}
        <use href="#us-star" x="3.25" y="7.2" />
        <use href="#us-star" x="5.75" y="7.2" />
        <use href="#us-star" x="8.25" y="7.2" />

        {/* Row 5 */}
        <use href="#us-star" x="2.0" y="9.0" />
        <use href="#us-star" x="4.5" y="9.0" />
        <use href="#us-star" x="7.0" y="9.0" />
        <use href="#us-star" x="9.5" y="9.0" />
      </g>
    </svg>
  )
}
