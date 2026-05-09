import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RiFlashlightLine, RiSettings3Line, RiCheckboxCircleLine,
  RiEditLine, RiTimeLine, RiShieldLine, RiBookLine,
} from 'react-icons/ri';
import { testsApi, questionsApi } from '../services/api';
import Toast from '../components/Toast';

const difficultyOptions = [
  { value: 'easy', label: 'Easy', desc: 'Beginner-friendly questions', color: 'volt' },
  { value: 'medium', label: 'Medium', desc: 'Balanced challenge', color: 'sky' },
  { value: 'hard', label: 'Hard', desc: 'Advanced questions only', color: 'ember' },
  { value: 'mixed', label: 'Mixed', desc: 'All difficulty levels', color: 'ink' },
];

const typeOptions = [
  { value: 'mcq', label: 'MCQ Only', icon: RiCheckboxCircleLine },
  { value: 'fill_blank', label: 'Fill Blank Only', icon: RiEditLine },
  { value: 'mixed', label: 'Mixed Types', icon: RiSettings3Line },
];

const colorBorder = {
  volt: 'border-volt-500/60 bg-volt-500/10',
  sky: 'border-sky-500/60 bg-sky-500/10',
  ember: 'border-ember-500/60 bg-ember-500/10',
  ink: 'border-ink-400/60 bg-ink-700/30',
};
const colorText = {
  volt: 'text-volt-400',
  sky: 'text-sky-400',
  ember: 'text-ember-400',
  ink: 'text-ink-300',
};

export default function GenerateTest() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    num_questions: 10,
    difficulty: 'mixed',
    question_types: 'mixed',
    time_limit: 30,
    subject: '',
  });
  const [subjects, setSubjects] = useState([]);
  const [subjectsLoading, setSubjectsLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    questionsApi.getSubjects()
      .then(data => setSubjects(data || []))
      .catch(() => setSubjects([]))
      .finally(() => setSubjectsLoading(false));
  }, []);

  const showToast = (message, type = 'success') => setToast({ message, type });

  async function handleGenerate() {
    if (!form.subject) {
      showToast('Please select a subject before generating a test', 'error');
      return;
    }
    if (form.num_questions < 1 || form.num_questions > 100) {
      showToast('Number of questions must be between 1 and 100', 'error');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        num_questions: Number(form.num_questions),
        difficulty: form.difficulty,
        question_types: form.question_types,
        time_limit: Number(form.time_limit),
      };
      const data = await testsApi.generate(payload);
      const testId = data.id || data.test_id;
      if (!testId) throw new Error('Invalid response from server');
      navigate(`/test/${testId}`, { state: { timeLimit: form.time_limit } });
    } catch (err) {
      showToast(err.message || 'Failed to generate test', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-bold text-ink-50">Generate Test</h1>
        <p className="text-ink-500 text-sm font-body mt-0.5">
          Configure and generate a randomized test from your question bank
        </p>
      </div>

      {/* Config Card */}
      <div className="glass-card p-6 space-y-7">
        {/* Number of Questions */}
        <div>
          <label className="label-text">Number of Questions</label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={1}
              max={50}
              value={form.num_questions}
              onChange={e => setForm(f => ({ ...f, num_questions: Number(e.target.value) }))}
              className="flex-1 accent-[#9de619] h-1.5 rounded-full bg-ink-700 cursor-pointer"
            />
            <div className="w-16 text-center">
              <span className="font-display font-bold text-2xl text-volt-400">{form.num_questions}</span>
              <p className="text-[10px] text-ink-600 font-body">questions</p>
            </div>
          </div>
          <div className="flex justify-between text-[10px] text-ink-600 font-body mt-1 px-0.5">
            <span>1</span><span>25</span><span>50</span>
          </div>
        </div>

        {/* Time Limit */}
        <div>
          <label className="label-text flex items-center gap-1.5">
            <RiTimeLine className="text-sky-400" />
            Time Limit (minutes)
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={5}
              max={120}
              step={5}
              value={form.time_limit}
              onChange={e => setForm(f => ({ ...f, time_limit: Number(e.target.value) }))}
              className="flex-1 accent-[#06b6d4] h-1.5 rounded-full bg-ink-700 cursor-pointer"
            />
            <div className="w-16 text-center">
              <span className="font-display font-bold text-2xl text-sky-400">{form.time_limit}</span>
              <p className="text-[10px] text-ink-600 font-body">minutes</p>
            </div>
          </div>
        </div>

        {/* Subject Selector */}
        <div>
          <label className="label-text flex items-center gap-1.5">
            <RiBookLine className="text-volt-400" />
            Subject
            <span className="text-ember-400 ml-0.5">*</span>
          </label>
          {subjectsLoading ? (
            <div className="input-field flex items-center gap-2 text-ink-500">
              <span className="w-3.5 h-3.5 border-2 border-ink-600 border-t-ink-300 rounded-full animate-spin" />
              Loading subjects...
            </div>
          ) : subjects.length === 0 ? (
            <p className="text-xs text-ember-400 font-body mt-1">
              No subjects found. Upload study material first.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2 mt-1">
              {subjects.map(subj => (
                <button
                  key={subj}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, subject: subj }))}
                  className={`px-4 py-2 rounded-xl border text-sm font-display font-600 transition-all duration-200
                    ${
                      form.subject === subj
                        ? 'border-volt-500/70 bg-volt-500/15 text-volt-300'
                        : 'border-ink-700/50 text-ink-500 hover:border-ink-500 hover:text-ink-300 bg-ink-800/40'
                    }`}
                >
                  {subj}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Difficulty */}
        <div>
          <label className="label-text flex items-center gap-1.5">
            <RiShieldLine className="text-volt-400" />
            Difficulty Level
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {difficultyOptions.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setForm(f => ({ ...f, difficulty: opt.value }))}
                className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border text-center
                             transition-all duration-200 font-body
                             ${form.difficulty === opt.value
                               ? `${colorBorder[opt.color]} ${colorText[opt.color]}`
                               : 'border-ink-700/50 text-ink-500 hover:border-ink-500 hover:text-ink-300 bg-ink-800/40'
                             }`}
              >
                <span className="font-display font-600 text-sm">{opt.label}</span>
                <span className="text-[10px] leading-tight opacity-70">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Question Types */}
        <div>
          <label className="label-text">Question Types</label>
          <div className="flex gap-2 flex-wrap">
            {typeOptions.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setForm(f => ({ ...f, question_types: value }))}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm
                             transition-all duration-200 font-body
                             ${form.question_types === value
                               ? 'border-volt-500/50 bg-volt-500/10 text-volt-400'
                               : 'border-ink-700/50 text-ink-500 hover:border-ink-500 hover:text-ink-300 bg-ink-800/40'
                             }`}
              >
                <Icon className="text-base" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary + Generate */}
      <div className="glass-card p-5">
        <p className="text-xs font-semibold text-ink-500 uppercase tracking-widest font-display mb-3">
          Summary
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Subject', value: form.subject || '—' },
            { label: 'Questions', value: form.num_questions },
            { label: 'Time', value: `${form.time_limit}m` },
            { label: 'Difficulty', value: form.difficulty },
          ].map(({ label, value }) => (
            <div key={label} className="bg-ink-800/60 rounded-xl px-3 py-2.5 border border-ink-700/40">
              <p className="text-[10px] text-ink-500 font-display uppercase tracking-widest">{label}</p>
              <p className="font-display font-600 text-sm text-ink-100 capitalize mt-0.5">{value}</p>
            </div>
          ))}
        </div>

        <button
          className="btn-primary w-full justify-center py-3 text-base"
          onClick={handleGenerate}
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="w-5 h-5 border-2 border-ink-950/30 border-t-ink-950 rounded-full animate-spin" />
              Generating Test...
            </>
          ) : (
            <>
              <RiFlashlightLine className="text-lg" />
              Generate Test
            </>
          )}
        </button>
      </div>
    </div>
  );
}