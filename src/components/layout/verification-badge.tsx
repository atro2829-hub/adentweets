'use client';

interface VerificationBadgeProps {
  type: 'blue' | 'gray' | 'gold';
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 14,
  md: 18,
  lg: 24,
};

const colorMap = {
  blue: '#1D9BF0',
  gray: '#8B98A5',
  gold: '#FFD700',
};

export function VerificationBadge({ type, size = 'md' }: VerificationBadgeProps) {
  const s = sizeMap[size];
  const color = colorMap[type];

  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 inline-block"
      aria-label="حساب موثّق"
    >
      <circle cx="12" cy="12" r="12" fill={color} />
      {type === 'gold' ? (
        <path
          d="M12 5L13.79 8.6L18 9.18L14.91 11.82L15.68 16L12 13.77L8.32 16L9.09 11.82L6 9.18L10.21 8.6L12 5Z"
          fill="white"
          stroke="white"
          strokeWidth="0.5"
        />
      ) : (
        <path
          d="M9.5 12.5L11 14L14.5 10.5"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}