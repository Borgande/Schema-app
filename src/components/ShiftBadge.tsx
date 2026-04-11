import { ShiftType } from '@/lib/types';
import { SHIFT_INFO } from '@/lib/schedule';

interface ShiftBadgeProps {
  type: ShiftType;
  showDuration?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const COLOR_MAP: Record<ShiftType, string> = {
  D: 'bg-blue-100 text-blue-800 border-blue-200',
  N: 'bg-purple-100 text-purple-800 border-purple-200',
  X: 'bg-orange-100 text-orange-900 border-orange-200',
  L: 'bg-gray-100 text-gray-500 border-gray-200',
};

const SIZE_MAP = {
  sm: 'text-xs px-1.5 py-0.5',
  md: 'text-sm px-2 py-1',
  lg: 'text-base px-3 py-1.5',
};

export default function ShiftBadge({ type, showDuration = false, size = 'md' }: ShiftBadgeProps) {
  const info = SHIFT_INFO[type];
  return (
    <span
      className={`inline-flex flex-col items-center rounded border font-medium ${COLOR_MAP[type]} ${SIZE_MAP[size]}`}
    >
      <span>{info.label}</span>
      {showDuration && type !== 'L' && (
        <span className="text-xs opacity-75">{info.duration}</span>
      )}
    </span>
  );
}
