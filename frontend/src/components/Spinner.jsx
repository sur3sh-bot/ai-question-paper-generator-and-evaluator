export default function Spinner({ size = 'md', text }) {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-7 h-7 border-2',
    lg: 'w-10 h-10 border-[3px]',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={`${sizes[size]} rounded-full border-volt-500/20 border-t-volt-500 animate-spin`}
      />
      {text && (
        <p className="text-ink-500 text-sm font-body animate-pulse-slow">{text}</p>
      )}
    </div>
  );
}

export function PageLoader({ text = 'Loading...' }) {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Spinner size="lg" text={text} />
    </div>
  );
}