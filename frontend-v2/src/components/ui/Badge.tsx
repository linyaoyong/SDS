import React from 'react';

type BadgeProps = {
  children: React.ReactNode;
  color?: 'blue' | 'green' | 'yellow' | 'orange' | 'red' | 'gray';
  className?: string;
};

const map: Record<NonNullable<BadgeProps['color']>, string> = {
  blue: 'bg-blue-100 text-blue-800',
  green: 'bg-green-100 text-green-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  orange: 'bg-orange-100 text-orange-800',
  red: 'bg-red-100 text-red-800',
  gray: 'bg-gray-100 text-gray-800',
};

export function Badge({ children, color = 'gray', className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${map[color]} ${className}`}>
      {children}
    </span>
  );
}