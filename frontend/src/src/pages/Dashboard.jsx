import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  RiQuestionLine,
  RiFileList3Line,
  RiBarChartLine,
  RiAddLine,
  RiArrowRightLine,
  RiTrophyLine,
  RiLightbulbLine,
  RiFlashlightLine,
  RiCheckboxCircleLine,
} from 'react-icons/ri';
import { questionsApi, resultsApi, testsApi } from '../services/api';
import { PageLoader } from '../components/Spinner';
import { getResultAccuracy, getResultCorrect, getResultSubject } from '../utils/results';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recentResults, setRecentResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsData, resultsData] = await Promise.allSettled([
          questionsApi.getStats(),
          resultsApi.getAll(),
        ]);

        if (statsData.status === 'fulfilled') {
          setStats(statsData.value);
        } else {
          // Fallback mock stats if backend not connected
          setStats({ total: 0, mcq: 0, fill_blank: 0, avg_score: 0, total_tests: 0 });
        }

        if (resultsData.status === 'fulfilled') {
          setRecentResults((resultsData.value || []).slice(0, 3));
        }
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) return <PageLoader text="Loading dashboard..." />;

  const statCards = [
    {
      label: 'Total Questions',
      value: stats?.total ?? 0,
      icon: RiQuestionLine,
      color: 'volt',
      sub: 'In question bank',
    },
    {
      label: 'MCQ Questions',
      value: stats?.mcq ?? 0,
      icon: RiCheckboxCircleLine,
      color: 'sky',
      sub: 'Multiple choice',
    },
    {
      label: 'Fill in Blanks',
      value: stats?.fill_blank ?? 0,
      icon: RiLightbulbLine,
      color: 'amber',
      sub: 'Text answer',
    },
    {
      label: 'Avg Score',
      value: `${stats?.avg_score ?? 0}%`,
      icon: RiTrophyLine,
      color: 'ember',
      sub: 'Across all tests',
    },
  ];

  const colorMap = {
    volt: 'text-volt-400 bg-volt-500/10 border-volt-500/20',
    sky: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    ember: 'text-ember-400 bg-ember-500/10 border-ember-500/20',
  };

  const quickActions = [
    {
      to: '/questions',
      label: 'Add Question',
      desc: 'Expand your question bank',
      icon: RiAddLine,
      accent: 'volt',
    },
    {
      to: '/generate-test',
      label: 'Generate Test',
      desc: 'Create a randomized test',
      icon: RiFlashlightLine,
      accent: 'sky',
    },
    {
      to: '/results',
      label: 'View Results',
      desc: 'Check your performance',
      icon: RiBarChartLine,
      accent: 'ember',
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="font-display text-3xl font-bold text-ink-50 mb-1">
          Dashboard
        </h1>
        <p className="text-ink-500 text-sm font-body">
          AI-powered question generation and evaluation platform
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className="stat-card"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center
                              ${colorMap[card.color]}`}>
                <Icon className="text-lg" />
              </div>
              <div>
                <p className="font-display font-bold text-2xl text-ink-50 leading-none mb-1">
                  {card.value}
                </p>
                <p className="text-xs font-semibold text-ink-400 font-display">{card.label}</p>
                <p className="text-[11px] text-ink-600 font-body mt-0.5">{card.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-1 space-y-3">
          <h2 className="font-display font-600 text-base text-ink-300">Quick Actions</h2>
          {quickActions.map(({ to, label, desc, icon: Icon, accent }) => (
            <Link
              key={to}
              to={to}
              className="glass-card-hover flex items-center gap-4 p-4 group"
            >
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0
                              ${colorMap[accent]}`}>
                <Icon className="text-lg" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display font-600 text-sm text-ink-100">{label}</p>
                <p className="text-xs text-ink-500 font-body">{desc}</p>
              </div>
              <RiArrowRightLine className="text-ink-600 group-hover:text-ink-300 group-hover:translate-x-1
                                          transition-all duration-200 flex-shrink-0" />
            </Link>
          ))}
        </div>

        {/* Recent Results */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-600 text-base text-ink-300">Recent Results</h2>
            <Link to="/results" className="text-xs text-volt-500 hover:text-volt-400 font-display
                                           flex items-center gap-1 transition-colors">
              View all <RiArrowRightLine />
            </Link>
          </div>

          {recentResults.length === 0 ? (
            <div className="glass-card flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-ink-800 border border-ink-700 flex items-center
                              justify-center mb-3">
                <RiBarChartLine className="text-ink-500 text-xl" />
              </div>
              <p className="font-display text-sm text-ink-400">No results yet</p>
              <p className="text-xs text-ink-600 font-body mt-1">
                Generate a test to get started
              </p>
              <Link to="/generate-test" className="btn-primary mt-4 text-xs">
                <RiFlashlightLine />
                Generate Test
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentResults.map((result, i) => {
                const correct = getResultCorrect(result);
                const pct = getResultAccuracy(result) ||
                  (result.total > 0 ? Math.round((correct / result.total) * 100) : 0);
                const subject = getResultSubject(result);
                return (
                  <div key={result.id || i} className="glass-card-hover p-4 flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0
                      ${pct >= 70 ? 'bg-volt-500/10 border border-volt-500/20' :
                        pct >= 50 ? 'bg-sky-500/10 border border-sky-500/20' :
                        'bg-ember-500/10 border border-ember-500/20'}`}>
                      <span className={`font-display font-bold text-sm
                        ${pct >= 70 ? 'text-volt-400' : pct >= 50 ? 'text-sky-400' : 'text-ember-400'}`}>
                        {pct}%
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-600 text-sm text-ink-100">
                        {subject}
                      </p>
                      <p className="text-xs text-ink-500 font-body">
                        {correct}/{result.total} correct
                        {result.created_at && ` · ${new Date(result.created_at).toLocaleDateString()}`}
                      </p>
                    </div>
                    <RiTrophyLine className={`text-lg flex-shrink-0
                      ${pct >= 70 ? 'text-volt-400' : pct >= 50 ? 'text-sky-400' : 'text-ember-400'}`} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Backend Connection Notice */}
      <div className="glass-card p-4 flex items-start gap-3">
        <div className="w-2 h-2 rounded-full bg-volt-500 mt-1.5 flex-shrink-0 animate-pulse" />
        <div>
          <p className="text-xs font-semibold text-ink-300 font-display">Backend API Status</p>
          <p className="text-xs text-ink-500 font-body mt-0.5">
            Connecting to <span className="font-mono text-volt-500">http://127.0.0.1:8000</span>.
            Make sure your FastAPI server is running. All data shown is live from the backend.
          </p>
        </div>
      </div>
    </div>
  );
}
