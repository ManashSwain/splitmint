import { Friend } from '../types';

interface AvatarProps {
  friend?: Friend;
  name?: string;
  color?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isMe?: boolean;
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({
  friend,
  name,
  color,
  size = 'md',
  isMe = false,
}: AvatarProps) {
  const displayName = friend?.name ?? name ?? '?';
  const bg = friend?.color ?? color ?? '#64748B';

  const sizeMap = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  };

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full font-display font-bold text-white shrink-0 select-none ${sizeMap[size]}`}
      style={{ backgroundColor: bg }}
      title={isMe ? `${displayName} (You)` : displayName}
      aria-label={isMe ? `${displayName} (You)` : displayName}
    >
      {getInitials(displayName)}
      {isMe && (
        <span
          className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#10B981] border-2 border-white"
          title="You"
        />
      )}
    </div>
  );
}
