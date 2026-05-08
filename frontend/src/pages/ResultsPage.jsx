import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  RiBarChartLine, RiTrophyLine, RiFlashlightLine,
  RiCheckLine, RiCloseLine, RiArrowLeftLine,
} from 'react-icons/ri';
import { resultsApi } from '../services/api';
import ResultCard from '../components/ResultCard';
import { PageLoader } from '../components/Spinner';

const COLORS = ['#9de619', '#ff5722', '#06b6d4', '#f59e0b'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-ink-800 border border-ink-600/50 rounded-xl px-3 py-2 text-xs font-body">
        <p className="text-ink-300 mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }}>{p.name}: {p.value}</p>
        ))}
      </div>
    );
  }
  return null;
};

export default function ResultsPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const [results, setResults] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  // If navigated from test submission, show that result first
  const freshResult = location.state?.result;

  useEffect(() => {
    async function fetchData() {
      try {
        const [allResults, analyticsData] = await Promise.allSettled([
          resultsApi.getAll(),
          resultsApi.getAnalytics(),
        ]);
        if (allResults.status === 'fulfilled') {
          setResults(Array.isArray(allResults.value) ? allResults.value : allResults.value?.results || []);
        }
        if (analyticsData.status === 'fulfilled') {
          setAnalytics(analyticsData.value);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Build pie data from freshResult or aggregated results
  const buildPieData = (result) => {
    if (!result) return [];
    const correct = result.correct || result.score || 0;
    const wrong = result.wrong || (result.total - correct) || 0;
    return [
      { name: 'Correct', value: correct },
      { name: 'Wrong', value: wrong },
    ];
  };

  const pieData = freshResult
    ? buildPieData(freshResult)
    : analytics?.pie_data || (results.length > 0
      ? buildPieData({
          correct: results.reduce((s, r) => s + (r.correct || r.score || 0), 0),
          wrong: results.reduce((s, r) => s + (r.wrong || ((r.total || 0) - (r.correct || r.score || 0))), 0),
          total: results.reduce((s, r) => s + (r.total || 0), 0),
        })
      : []);

  const barData = analytics?.bar_data ||
    results.slice(-8).map((r, i) => ({
      name: `T${i + 1}`,
      Score: r.accuracy || (r.total > 0 ? Math.round(((r.score || r.correct || 0) / r.total) * 100) : 0),
    }));

  if (loading) return <PageLoader text="Loading results..." />;

  const displayResult = freshResult || (results.length > 0 ? results[results.length - 1] : null);

  return (
    <div className="space-y-7 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-BOLD text-ink-50">Results & Analytics</h1>
          <p className="text-ink-500 text-sm font-body mt-0.5">
            {results.length} test{results.length !== 1 ? 's' : ''} completed
          </p>
        </div>
        <Link to="/generate-test" className="btn-primary">
          <RiFlashlightLine /> New Test
        </Link>
      </div>

      {/* Fresh result highlight */}
      {freshResult && (
        <div>
          <p className="text-xs font-semibold text-volt-500 uppercase tracking-widest font-display mb-3 flex items-center gap-2">
            <RiTrophyLine /> Latest Result
          </p>
          <ResultCard result={freshResult} />
        </div>
      )}

      {/* Charts */}
      {(pieData.length > 0 || barData.length > 0) && (
        <div className="grid lg:grid-cols-2 gap-5">
          {/* Pie Chart */}
          {pieData.length > 0 && (
            <div className="glass-card p-5">
              <h3 className="font-display font-600 text-sm text-ink-300 mb-4 flex items-center gap-2">
                <RiBarChartLine className="text-volt-400" />
                Correct vs Wrong
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={index} fill={index === 0 ? '#9de619' : '#ff5722'} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    formatter={(value) => (
                      <span className="text-xs text-ink-400 font-body">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Center Stats */}
              <div className="flex justify-center gap-6 mt-2">
                <div className="flex items-center gap-2">
                  <RiCheckLine className="text-volt-400" />
                  <span className="text-sm font-display font-600 text-ink-200">
                    {pieData[0]?.value || 0} Correct
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <RiCloseLine className="text-ember-400" />
                  <span className="text-sm font-display font-600 text-ink-200">
                    {pieData[1]?.value || 0} Wrong
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Bar Chart */}
          {barData.length > 0 && (
            <div className="glass-card p-5">
              <h3 className="font-display font-600 text-sm text-ink-300 mb-4">
                Score History (%)
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,99,142,0.12)" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#7a7a9d', fontSize: 11, fontFamily: 'DM Sans' }}
                    axisLine={false} tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: '#7a7a9d', fontSize: 11, fontFamily: 'DM Sans' }}
                    axisLine={false} tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(157,230,25,0.05)' }} />
                  <Bar dataKey="Score" fill="#9de619" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Performance Summary */}
      {analytics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Tests', value: analytics.total_tests ?? results.length, color: 'sky' },
            { label: 'Best Score', value: `${analytics.best_score ?? 0}%`, color: 'volt' },
            { label: 'Avg Score', value: `${analytics.avg_score ?? 0}%`, color: 'amber' },
            { label: 'Total Questions', value: analytics.total_questions ?? 0, color: 'ember' },
          ].map(({ label, value, color }) => {
            const colorCls = {
              volt: 'text-volt-400 border-volt-500/20 bg-volt-500/8',
              sky: 'text-sky-400 border-sky-500/20 bg-sky-500/8',
              amber: 'text-amber-400 border-amber-500/20 bg-amber-500/8',
              ember: 'text-ember-400 border-ember-500/20 bg-ember-500/8',
            }[color];
            return (
              <div key={label} className={`rounded-2xl border p-4 ${colorCls}`}>
                <p className="text-[10px] font-semibold uppercase tracking-widest font-display opacity-70 mb-1">{label}</p>
                <p className="font-display font-bold text-xl">{value}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* All Results List */}
      {results.length > 0 && (
        <div>
          <h2 className="font-display font-600 text-base text-ink-300 mb-3">All Results</h2>
          <div className="space-y-3">
            {[...results].reverse().map((result, i) => (
              <ResultCard key={result.id || i} result={result} />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {results.length === 0 && !freshResult && (
        <div className="glass-card flex flex-col items-center justify-center py-16 text-center">
          <RiBarChartLine className="text-4xl text-ink-600 mb-3" />
          <p className="font-display text-base text-ink-400">No results yet</p>
          <p className="text-xs text-ink-600 font-body mt-1 mb-5">
            Complete a test to see your performance here
          </p>
          <Link to="/generate-test" className="btn-primary">
            <RiFlashlightLine /> Generate Test
          </Link>
        </div>
      )}
    </div>
  );
}