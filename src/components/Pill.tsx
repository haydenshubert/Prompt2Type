import type { ReactNode } from 'react';

interface PillProps {
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
  title?: string;
}

/** Toolbar toggle button used across the config bar and settings. */
export function Pill({ active, onClick, children, title }: PillProps) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={active}
      onClick={onClick}
      className={
        'rounded-md px-2.5 py-1 text-sm transition-colors ' +
        (active ? 'text-main' : 'text-sub hover:text-text')
      }
    >
      {children}
    </button>
  );
}

export function Divider() {
  return <span className="mx-1 hidden h-4 w-px bg-sub/40 sm:block" aria-hidden />;
}
