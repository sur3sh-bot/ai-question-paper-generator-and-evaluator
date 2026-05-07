import { useState, useEffect } from 'react';
import {
  RiAddLine, RiSearchLine, RiFilterLine, RiCloseLine,
  RiQuestionLine, RiRefreshLine,
} from 'react-icons/ri';
import { questionsApi } from '../services/api';
import QuestionCard from '../components/QuestionCard';
import { PageLoader } from '../components/Spinner';
import Toast from '../components/Toast';

const DIFFICULTIES = ['all', 'easy', 'medium', 'hard'];
const TYPES = ['all', 'mcq', 'fill_blank'];

const emptyForm = {
  question: '',
  type: 'mcq',
  options: ['', '', '', ''],
  correct_answer: '',
  difficulty: 'easy',
};

export default function QuestionManager() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [filterDiff, setFilterDiff] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => setToast({ message, type });

  useEffect(() => { fetchQuestions(); }, []);

  async function fetchQuestions() {
    setLoading(true);
    try {
      const data = await questionsApi.getAll();
      setQuestions(Array.isArray(data) ? data : data.questions || []);
    } catch (err) {
      showToast(err.message || 'Failed to load questions', 'error');
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.question.trim() || !form.correct_answer.trim()) {
      showToast('Please fill in all required fields', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        options: form.type === 'mcq' ? form.options.filter(o => o.trim()) : [],
      };
      await questionsApi.create(payload);
      showToast('Question added successfully!');
      setForm(emptyForm);
      setShowForm(false);
      fetchQuestions();
    } catch (err) {
      showToast(err.message || 'Failed to add question', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this question?')) return;
    try {
      await questionsApi.delete(id);
      showToast('Question deleted');
      setQuestions(prev => prev.filter(q => q.id !== id));
    } catch (err) {
      showToast(err.message || 'Failed to delete', 'error');
    }
  }

  const filtered = questions.filter(q => {
    const type = (q.type || q.question_type || '').toLowerCase();
    const diff = (q.difficulty || '').toLowerCase();
    const text = (q.question || q.text || '').toLowerCase();
    const matchSearch = !search || text.includes(search.toLowerCase());
    const matchDiff = filterDiff === 'all' || diff === filterDiff;
    const matchType = filterType === 'all' || type === filterType;
    return matchSearch && matchDiff && matchType;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink-50">Questions</h1>
          <p className="text-ink-500 text-sm font-body mt-0.5">
            {questions.length} question{questions.length !== 1 ? 's' : ''} in bank
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchQuestions} className="btn-secondary !px-3" title="Refresh">
            <RiRefreshLine className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary">
            {showForm ? <RiCloseLine /> : <RiAddLine />}
            {showForm ? 'Cancel' : 'Add Question'}
          </button>
        </div>
      </div>

      {/* Add Question Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="glass-card p-6 space-y-5 animate-slide-up">
          <h2 className="font-display font-600 text-base text-ink-100 flex items-center gap-2">
            <RiQuestionLine className="text-volt-500" />
            New Question
          </h2>

          {/* Question Text */}
          <div>
            <label className="label-text">Question Text *</label>
            <textarea
              className="input-field resize-none"
              rows={3}
              placeholder="Enter your question..."
              value={form.question}
              onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
              required
            />
          </div>

          {/* Type & Difficulty row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text">Question Type</label>
              <select
                className="select-field"
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value, options: ['', '', '', ''] }))}
              >
                <option value="mcq">Multiple Choice (MCQ)</option>
                <option value="fill_blank">Fill in the Blank</option>
              </select>
            </div>
            <div>
              <label className="label-text">Difficulty</label>
              <select
                className="select-field"
                value={form.difficulty}
                onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          {/* MCQ Options */}
          {form.type === 'mcq' && (
            <div>
              <label className="label-text">Options (A, B, C, D)</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {form.options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-ink-700 flex items-center justify-center
                                     text-xs font-semibold text-ink-400 flex-shrink-0 font-display">
                      {['A', 'B', 'C', 'D'][idx]}
                    </span>
                    <input
                      className="input-field"
                      placeholder={`Option ${['A', 'B', 'C', 'D'][idx]}`}
                      value={opt}
                      onChange={e => {
                        const opts = [...form.options];
                        opts[idx] = e.target.value;
                        setForm(f => ({ ...f, options: opts }));
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Correct Answer */}
          <div>
            <label className="label-text">
              Correct Answer *
              {form.type === 'mcq' && (
                <span className="text-ink-600 normal-case tracking-normal ml-1">(e.g. A, B, C, or D — or full option text)</span>
              )}
            </label>
            <input
              className="input-field"
              placeholder={form.type === 'mcq' ? 'Enter A, B, C, or D' : 'Enter the correct answer'}
              value={form.correct_answer}
              onChange={e => setForm(f => ({ ...f, correct_answer: e.target.value }))}
              required
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? (
                <span className="w-4 h-4 border-2 border-ink-950/30 border-t-ink-950 rounded-full animate-spin" />
              ) : <RiAddLine />}
              {submitting ? 'Saving...' : 'Save Question'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => { setForm(emptyForm); setShowForm(false); }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500 text-sm" />
          <input
            className="input-field pl-9"
            placeholder="Search questions..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <RiFilterLine className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500 text-sm pointer-events-none" />
            <select
              className="select-field pl-8 pr-3 w-auto"
              value={filterDiff}
              onChange={e => setFilterDiff(e.target.value)}
            >
              {DIFFICULTIES.map(d => (
                <option key={d} value={d}>{d === 'all' ? 'All Difficulties' : d.charAt(0).toUpperCase() + d.slice(1)}</option>
              ))}
            </select>
          </div>
          <select
            className="select-field pr-3 w-auto"
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
          >
            {TYPES.map(t => (
              <option key={t} value={t}>
                {t === 'all' ? 'All Types' : t === 'mcq' ? 'MCQ' : 'Fill Blank'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Questions List */}
      {loading ? (
        <PageLoader text="Loading questions..." />
      ) : filtered.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center py-16 text-center">
          <RiQuestionLine className="text-4xl text-ink-600 mb-3" />
          <p className="font-display text-base text-ink-400">No questions found</p>
          <p className="text-xs text-ink-600 font-body mt-1">
            {search || filterDiff !== 'all' || filterType !== 'all'
              ? 'Try adjusting your filters'
              : 'Add your first question using the button above'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filtered.map(q => (
            <QuestionCard key={q.id} question={q} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}