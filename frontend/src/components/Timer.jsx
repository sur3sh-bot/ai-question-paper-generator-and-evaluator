import { useState, useEffect, useRef } from 'react';
import { RiTimeLine, RiAlarmWarningLine } from 'react-icons/ri';

export default function Timer({ durationMinutes = 30, onExpire }) {
  const totalSeconds = durationMinutes * 60;
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const [isWarning, setIsWarning] = useState(false);
  const intervalRef = useRef(null);
  const hasExpiredRef = useRef(false);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        const next = prev - 1;

        if (next <= 60 && !isWarning) {
          setIsWarning(true);
        }

        if (next <= 0 && !hasExpiredRef.current) {
          hasExpiredRef.current = true;
          clearInterval(intervalRef.current);
          onExpire?.();
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, []);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const progress = (secondsLeft / totalSeconds) * 100;

  const strokeDasharray = 2 * Math.PI * 20;
  const strokeDashoffset = strokeDasharray * (1 - progress / 100);

  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all duration-500
      ${isWarning
        ? 'bg-ember-500/10 border-ember-500/40 text-ember-400 animate-pulse-slow'
        : 'bg-ink-800/60 border-ink-600/50 text-ink-300'
      }`}
    >
      {/* SVG Ring */}
      <div className="relative w-10 h-10 flex-shrink-0">
        <svg className="w-10 h-10 -rotate-90" viewBox="0 0 44 44">
          <circle
            cx="22" cy="22" r="20"
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.1"
            strokeWidth="3"
          />
          <circle
            cx="22" cy="22" r="20"
            fill="none"
            stroke={isWarning ? '#ff5722' : '#9de619'}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          {isWarning
            ? <RiAlarmWarningLine className="text-ember-400 text-sm animate-pulse" />
            : <RiTimeLine className="text-volt-500 text-sm" />
          }
        </div>
      </div>

      {/* Time Display */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest font-display opacity-60 leading-none mb-0.5">
          {isWarning ? 'Hurry!' : 'Time Left'}
        </p>
        <p className="font-mono text-lg font-medium leading-none">
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </p>
      </div>
    </div>
  );
}