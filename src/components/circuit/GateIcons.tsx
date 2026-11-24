import React from 'react';
import type { ComponentType } from '@/types/circuit';

interface GateMiniIconProps {
  type: ComponentType;
  className?: string;
}

export const GateMiniIcon: React.FC<GateMiniIconProps> = ({
  type,
  className = 'w-8 h-5',
}) => {
  switch (type) {
    case 'GATE_AND':
      return (
        <svg viewBox="0 0 48 28" className={className} fill="none">
          <line x1="2" y1="9" x2="11" y2="9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="2" y1="19" x2="11" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path
            d="M 11 4 L 24 4 A 10 10 0 0 1 24 24 L 11 24 Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <line x1="34" y1="14" x2="46" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case 'GATE_NAND':
      return (
        <svg viewBox="0 0 48 28" className={className} fill="none">
          <line x1="2" y1="9" x2="10" y2="9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="2" y1="19" x2="10" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path
            d="M 10 4 L 22 4 A 10 10 0 0 1 22 24 L 10 24 Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <circle cx="35" cy="14" r="2.8" stroke="currentColor" strokeWidth="2" />
          <line x1="38" y1="14" x2="46" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case 'GATE_OR':
      return (
        <svg viewBox="0 0 48 28" className={className} fill="none">
          <line x1="2" y1="9" x2="13" y2="9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="2" y1="19" x2="13" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path
            d="M 10 4 Q 17 14 10 24 L 20 24 Q 30 24 36 14 Q 30 4 20 4 Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <line x1="36" y1="14" x2="46" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case 'GATE_NOR':
      return (
        <svg viewBox="0 0 48 28" className={className} fill="none">
          <line x1="2" y1="9" x2="12" y2="9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="2" y1="19" x2="12" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path
            d="M 9 4 Q 16 14 9 24 L 18 24 Q 28 24 33 14 Q 28 4 18 4 Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <circle cx="36" cy="14" r="2.8" stroke="currentColor" strokeWidth="2" />
          <line x1="39" y1="14" x2="46" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case 'GATE_NOT':
      return (
        <svg viewBox="0 0 48 28" className={className} fill="none">
          <line x1="2" y1="14" x2="12" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path
            d="M 12 4 L 32 14 L 12 24 Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <circle cx="35.5" cy="14" r="2.8" stroke="currentColor" strokeWidth="2" />
          <line x1="38.5" y1="14" x2="46" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case 'POWER_VCC':
      return (
        <svg viewBox="0 0 36 28" className={className} fill="none">
          <line x1="10" y1="8" x2="26" y2="8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          <line x1="18" y1="8" x2="18" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="18" cy="24" r="2.2" fill="currentColor" />
        </svg>
      );

    case 'POWER_GND':
      return (
        <svg viewBox="0 0 36 28" className={className} fill="none">
          <line x1="18" y1="4" x2="18" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="8" y1="14" x2="28" y2="14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="12" y1="19" x2="24" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="15.5" y1="24" x2="20.5" y2="24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    default:
      return null;
  }
};
