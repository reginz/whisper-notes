"use client";

interface RecordFABProps {
  onClick: () => void;
  isConnecting?: boolean;
}

export function RecordFAB({ onClick, isConnecting }: RecordFABProps) {
  return (
    <button
      onClick={onClick}
      disabled={isConnecting}
      className="fixed bottom-8 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-surface shadow-lg transition-all active:scale-95 disabled:opacity-50"
      aria-label="Start recording"
    >
      {isConnecting ? (
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-text-secondary border-t-foreground" />
      ) : (
        /* Sound wave icon */
        <svg
          className="h-6 w-6 text-foreground"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
        >
          <line x1="4" y1="8" x2="4" y2="16" />
          <line x1="8" y1="5" x2="8" y2="19" />
          <line x1="12" y1="3" x2="12" y2="21" />
          <line x1="16" y1="5" x2="16" y2="19" />
          <line x1="20" y1="8" x2="20" y2="16" />
        </svg>
      )}
    </button>
  );
}
