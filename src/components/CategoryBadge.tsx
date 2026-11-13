import React from 'react';
import {
  Utensils,
  BedDouble,
  TrainFront,
  Ticket,
  ShoppingBag,
  Receipt,
} from 'lucide-react';
import { CategoryId } from '../types';

export interface CategoryConfig {
  id: CategoryId;
  label: string;
  bgTint: string;
  textColor: string;
  barColor: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const CATEGORIES: Record<CategoryId, CategoryConfig> = {
  dining: {
    id: 'dining',
    label: 'Dining',
    bgTint: 'bg-amber-100/80',
    textColor: 'text-amber-700',
    barColor: '#F59E0B',
    icon: Utensils,
  },
  stay: {
    id: 'stay',
    label: 'Stay',
    bgTint: 'bg-indigo-100/80',
    textColor: 'text-indigo-700',
    barColor: '#6366F1',
    icon: BedDouble,
  },
  transit: {
    id: 'transit',
    label: 'Transit',
    bgTint: 'bg-sky-100/80',
    textColor: 'text-sky-700',
    barColor: '#0EA5E9',
    icon: TrainFront,
  },
  activities: {
    id: 'activities',
    label: 'Activities',
    bgTint: 'bg-emerald-100/80',
    textColor: 'text-emerald-700',
    barColor: '#10B981',
    icon: Ticket,
  },
  groceries: {
    id: 'groceries',
    label: 'Groceries',
    bgTint: 'bg-teal-100/80',
    textColor: 'text-teal-700',
    barColor: '#14B8A6',
    icon: ShoppingBag,
  },
  other: {
    id: 'other',
    label: 'Other',
    bgTint: 'bg-slate-100',
    textColor: 'text-slate-600',
    barColor: '#64748B',
    icon: Receipt,
  },
};

export const CATEGORY_LIST: CategoryConfig[] = [
  CATEGORIES.dining,
  CATEGORIES.stay,
  CATEGORIES.transit,
  CATEGORIES.activities,
  CATEGORIES.groceries,
  CATEGORIES.other,
];

export function CategoryIconCircle({
  category,
  size = 'md',
}: {
  category: CategoryId;
  size?: 'sm' | 'md' | 'lg';
}) {
  const cfg = CATEGORIES[category] ?? CATEGORIES.other;
  const Icon = cfg.icon;
  const sizeClass =
    size === 'sm'
      ? 'w-8 h-8'
      : size === 'lg'
        ? 'w-11 h-11'
        : 'w-10 h-10';
  const iconClass =
    size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-5 h-5' : 'w-[18px] h-[18px]';

  return (
    <div
      className={`${sizeClass} ${cfg.bgTint} ${cfg.textColor} rounded-full flex items-center justify-center shrink-0`}
      aria-hidden="true"
    >
      <Icon className={iconClass} />
    </div>
  );
}
