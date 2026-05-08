import { RiCheckLine, RiCloseLine, RiTrophyLine, RiTimeLine, RiBarChartLine } from 'react-icons/ri';

const scoreColor = (pct) => {
  if (pct >= 80) return 'text-volt-400';
  if (pct >= 60) return 'text-sky-400';
  if (pct >= 40) return 'text-amber-400';
  return 'text-ember-400';
};

const scoreLabel = (pct) => {
  if (pct >= 90) return 'Excellent!';
  if (pct >= 75) return 'Great Job!';
  if (pct >= 60) return 'Good Work';
  if (pct >= 40) return 'Keep Practicing';
  return 'Needs Improvement';
};

export default function ResultCard({ result }) {
  const {
    score = 0,
    total = 0,
    accuracy = 0,
    time_taken_seconds,
    correct = 0,
    wrong = 0,
    weak_areas = [],
    test_id,
    created_at,
  } = result;

  const pct = accuracy || (total > 0 ? Math.round((score / total) * 100) : 0);
  const correctCount = correct || score;
  const wrongCount = wrong || (total - score);

  const circumference = 2 * Math.PI * 36;
  const offset = circumference * (1 - pct / 100);

  return (
    <div className="glass-card p-6 animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-bold text-lg text-ink-50">
            {scoreLabel(pct)}
          </h3>
          {(test_id || created_at) && (
            <p className="text-xs text-ink-500 mt-0.5 font-body">
              {test_id && `Test #${test_id}`}
              {created_at && ` · ${new Date(created_at).toLocaleDateString()}`}
            </p>
          )}
        </div>
        <div className="w-10 h-10 rounded-xl bg-volt-500/15 border border-volt-500/25
                        flex items-center justify-center">
          <RiTrophyLine className="text-volt-400 text-lg" />
        </div>
      </div>

      {/* Score Ring + Stats */}
      <div className="flex items-center gap-6 flex-wrap">
        {/* Ring */}
        <div className="relative w-24 h-24 flex-shrink-0">
          <svg className="w-24 h-24 -rotate-90" viewBox="0 0 88 88">
            <circle cx="44" cy="44" r="36" fill="none"
              stroke="currentColor" strokeOpacity="0.08" strokeWidth="6" />
            <circle cx="44" cy="44" r="36" fill="none"
              stroke={pct >= 70 ? '#9de619' : pct >= 50 ? '#06b6d4' : '#ff5722'}
              strokeWidth="6" strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 1s ease-out' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`font-display font-bold text-2xl leading-none ${scoreColor(pct)}`}>{pct}%</span>
            <span className="text-[10px] text-ink-500 font-body">accuracy</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 flex-1 min-w-[180px]">
          <div className="bg-ink-800/60 rounded-xl p-3 border border-ink-700/40">
            <p className="text-[10px] font-semibold text-ink-500 uppercase tracking-widest font-display mb-1">Score</p>
            <p className="font-display font-bold text-xl text-ink-50">
              {correctCount}<span className="text-ink-500 text-sm font-normal">/{total}</span>
            </p>
          </div>
          <div className="bg-ink-800/60 rounded-xl p-3 border border-ink-700/40">
            <p className="text-[10px] font-semibold text-ink-500 uppercase tracking-widest font-display mb-1">Correct</p>
            <div className="flex items-center gap-1.5">
              <RiCheckLine className="text-volt-400 text-base" />
              <span className="font-display font-bold text-xl text-volt-400">{correctCount}</span>
            </div>
          </div>
          <div className="bg-ink-800/60 rounded-xl p-3 border border-ink-700/40">
            <p className="text-[10px] font-semibold text-ink-500 uppercase tracking-widest font-display mb-1">Wrong</p>
            <div className="flex items-center gap-1.5">
              <RiCloseLine className="text-ember-400 text-base" />
              <span className="font-display font-bold text-xl text-ember-400">{wrongCount}</span>
            </div>
          </div>
          {time_taken_seconds && (
            <div className="bg-ink-800/60 rounded-xl p-3 border border-ink-700/40">
              <p className="text-[10px] font-semibold text-ink-500 uppercase tracking-widest font-display mb-1">Time</p>
              <div className="flex items-center gap-1.5">
                <RiTimeLine className="text-sky-400 text-sm" />
                <span className="font-display font-bold text-sm text-ink-200">
                  {Math.floor(time_taken_seconds / 60)}m {time_taken_seconds % 60}s
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Weak Areas */}
      {weak_areas && weak_areas.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <RiBarChartLine className="text-ember-400 text-sm" />
            <p className="text-xs font-semibold text-ink-400 uppercase tracking-widest font-display">
              Weak Areas
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {weak_areas.map((area, i) => (
              <span key={i} className="px-3 py-1 rounded-lg text-xs bg-ember-500/10
                                      border border-ember-500/25 text-ember-400 font-body">
                {area}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}