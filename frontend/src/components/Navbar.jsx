import { NavLink, useLocation } from 'react-router-dom';
import {
  RiDashboardLine,
  RiQuestionLine,
  RiFileList3Line,
  RiBarChartLine,
  RiBrainLine,
  RiMenuLine,
  RiCloseLine,
} from 'react-icons/ri';
import { useState } from 'react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: RiDashboardLine, exact: true },
  { to: '/questions', label: 'Questions', icon: RiQuestionLine },
  { to: '/generate-test', label: 'Generate Test', icon: RiFileList3Line },
  { to: '/results', label: 'Results', icon: RiBarChartLine },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-60 z-40
                        bg-ink-900/80 backdrop-blur-md border-r border-ink-700/50">
        {/* Logo */}
        <div className="px-6 pt-8 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-volt-500 flex items-center justify-center flex-shrink-0 glow-volt">
              <RiBrainLine className="text-ink-950 text-lg" />
            </div>
            <div>
              <p className="font-display font-bold text-sm text-ink-50 leading-tight">AI Question</p>
              <p className="font-display font-bold text-sm text-volt-400 leading-tight">Generator</p>
            </div>
          </div>
        </div>

        <div className="h-px bg-ink-700/50 mx-4" />

        {/* Nav Links */}
        <nav className="flex flex-col gap-1 px-3 pt-5 flex-1">
          <p className="text-[10px] font-semibold text-ink-500 uppercase tracking-widest px-3 mb-2 font-display">
            Navigation
          </p>
          {navItems.map(({ to, label, icon: Icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 font-body
                 ${isActive
                   ? 'bg-volt-500/15 text-volt-400 border border-volt-500/25'
                   : 'text-ink-400 hover:text-ink-200 hover:bg-ink-800/60'
                 }`
              }
            >
              <Icon className="text-base flex-shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-5 pb-6">
          <div className="glass-card p-3">
            <p className="text-xs text-ink-500 font-body leading-relaxed">
              Connected to FastAPI backend at{' '}
              <span className="font-mono text-volt-500 text-[10px]">localhost:8000</span>
            </p>
          </div>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40
                         bg-ink-900/90 backdrop-blur-md border-b border-ink-700/50
                         flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-volt-500 flex items-center justify-center">
            <RiBrainLine className="text-ink-950 text-sm" />
          </div>
          <span className="font-display font-bold text-sm text-ink-50">AI Generator</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="w-9 h-9 flex items-center justify-center rounded-xl
                     bg-ink-800 border border-ink-600 text-ink-300 hover:text-ink-100 transition-colors"
        >
          {mobileOpen ? <RiCloseLine className="text-lg" /> : <RiMenuLine className="text-lg" />}
        </button>
      </header>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-30 pt-14">
          <div
            className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <nav className="relative bg-ink-900 border-b border-ink-700/50 px-3 py-4 flex flex-col gap-1 animate-slide-up">
            {navItems.map(({ to, label, icon: Icon, exact }) => (
              <NavLink
                key={to}
                to={to}
                end={exact}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-200
                   ${isActive
                     ? 'bg-volt-500/15 text-volt-400 border border-volt-500/25'
                     : 'text-ink-400 hover:text-ink-200 hover:bg-ink-800'
                   }`
                }
              >
                <Icon className="text-base" />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}