import { useState } from 'react';
import {
  RiUploadCloud2Line, RiFileTextLine, RiMagicLine,
  RiCheckLine, RiEditLine, RiCloseLine, RiLoader4Line,
} from 'react-icons/ri';
import api, { questionsApi } from '../services/api';
import Toast from './Toast';

export default function AIQuestionGenerator({ onComplete }) {
  const [status, setStatus] = useState('idle'); // idle | processing | done
  const [currentStep, setCurrentStep] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [toast, setToast] = useState(null);

  // Edit state
  const [editIdx, setEditIdx] = useState(null);
  const [editForm, setEditForm] = useState({});

  const showToast = (message, type = 'success') => setToast({ message, type });

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate extension
    const allowed = /\.(pdf|docx|pptx|txt)$/i;
    if (!allowed.test(file.name)) {
      showToast('Only .pdf, .docx, .pptx, .txt files are allowed', 'error');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      showToast('File must be under 20 MB', 'error');
      return;
    }

    setStatus('processing');
    setCurrentStep(0);

    // Advance visual steps while waiting for the backend
    const stepTimer = setInterval(() => {
      setCurrentStep(prev => (prev < 2 ? prev + 1 : prev));
    }, 5000);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const { data } = await api.post('/upload/material', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 600000, // 10 min timeout for large docs
      });

      clearInterval(stepTimer);
      setQuestions(data.questions || []);
      setStatus('done');
      showToast(`Generated ${data.questions_generated ?? data.questions?.length ?? 0} questions from "${file.name}"`);
    } catch (err) {
      clearInterval(stepTimer);
      setStatus('idle');
      showToast(err.message || 'Upload failed', 'error');
    }

    // Reset the input so the same file can be re-selected
    e.target.value = '';
  };

  const handleConfirmAll = () => {
    showToast('Questions confirmed and added to bank!');
    if (onComplete) onComplete(questions);
  };

  // ── Inline editing ────────────────────────────────────────────────────────
  const startEdit = (idx) => {
    setEditIdx(idx);
    setEditForm({ ...questions[idx] });
  };

  const cancelEdit = () => {
    setEditIdx(null);
    setEditForm({});
  };

  const saveEdit = async () => {
    try {
      if (editForm.id) {
        const updated = await questionsApi.update(editForm.id, editForm);
        setQuestions(prev => prev.map((q, i) => i === editIdx ? updated : q));
      } else {
        setQuestions(prev => prev.map((q, i) => i === editIdx ? editForm : q));
      }
      showToast('Question updated');
      cancelEdit();
    } catch (err) {
      showToast(err.message || 'Update failed', 'error');
    }
  };

  // ── Step definitions ──────────────────────────────────────────────────────
  const steps = [
    { label: 'Uploading Document', icon: RiUploadCloud2Line },
    { label: 'Extracting & Cleaning', icon: RiFileTextLine },
    { label: 'MiniMax AI Generating', icon: RiMagicLine },
  ];

  const diffBadge = (d) => {
    switch ((d || '').toLowerCase()) {
      case 'easy': return 'badge-easy';
      case 'medium': return 'badge-medium';
      case 'hard': return 'badge-hard';
      default: return 'badge-medium';
    }
  };

  const typeBadge = (t) => (t === 'mcq' ? 'badge-mcq' : 'badge-fill');

  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── IDLE: file picker ─────────────────────────────────────────────── */}
      {status === 'idle' && (
        <label className="glass-card-hover flex flex-col items-center justify-center py-16 cursor-pointer group animate-fade-in">
          <input
            type="file"
            className="hidden"
            accept=".pdf,.docx,.pptx,.txt"
            onChange={handleFileSelect}
          />
          <div className="w-16 h-16 rounded-2xl bg-volt-500/10 border border-volt-500/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
            <RiUploadCloud2Line className="text-volt-400 text-3xl" />
          </div>
          <p className="font-display font-bold text-lg text-ink-100 mb-1">
            Upload Study Material
          </p>
          <p className="text-ink-500 text-sm font-body">
            Click to browse or drag & drop &nbsp;·&nbsp; .pdf, .docx, .pptx, .txt &nbsp;·&nbsp; max 20 MB
          </p>
        </label>
      )}

      {/* ── PROCESSING: step progress ─────────────────────────────────────── */}
      {status === 'processing' && (
        <div className="glass-card p-8 animate-fade-in">
          {/* Steps row */}
          <div className="flex items-center justify-center gap-2 mb-10">
            {steps.map((step, i) => {
              const Icon = step.icon;
              const active = i === currentStep;
              const done = i < currentStep;
              return (
                <div key={i} className="flex items-center gap-2">
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-500
                    ${active ? 'border-volt-500/40 bg-volt-500/10 text-volt-400' :
                      done ? 'border-volt-500/20 bg-volt-500/5 text-volt-500' :
                      'border-ink-700/50 text-ink-500'}`}>
                    {active ? (
                      <RiLoader4Line className="animate-spin text-lg" />
                    ) : done ? (
                      <RiCheckLine className="text-lg" />
                    ) : (
                      <Icon className="text-lg" />
                    )}
                    <span className="text-sm font-display font-semibold whitespace-nowrap">{step.label}</span>
                  </div>
                  {i < steps.length - 1 && (
                    <div className={`w-8 h-px ${done ? 'bg-volt-500/40' : 'bg-ink-700/50'} transition-colors duration-500`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Loading spinner */}
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-2 border-ink-700 border-t-volt-500 rounded-full animate-spin" />
            <p className="text-ink-400 text-sm font-body animate-pulse">
              This usually takes 15–30 seconds…
            </p>
          </div>
        </div>
      )}

      {/* ── DONE: results ─────────────────────────────────────────────────── */}
      {status === 'done' && (
        <div className="space-y-4 animate-slide-up">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-volt-500/10 border border-volt-500/20 flex items-center justify-center">
                <RiCheckLine className="text-volt-400 text-lg" />
              </div>
              <div>
                <h2 className="font-display font-bold text-lg text-ink-50">
                  {questions.length} Questions Generated
                </h2>
                <p className="text-ink-500 text-xs font-body">Review, edit, then confirm to save.</p>
              </div>
            </div>
            <button onClick={handleConfirmAll} className="btn-primary">
              <RiCheckLine /> Confirm All
            </button>
          </div>

          {/* Question cards */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {questions.map((q, idx) => (
              <div key={q.id || idx} className="glass-card p-5 space-y-3 relative group">
                {/* Badges row */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={diffBadge(q.difficulty)}>{q.difficulty || 'medium'}</span>
                  <span className={typeBadge(q.type)}>{q.type === 'mcq' ? 'MCQ' : 'Fill Blank'}</span>
                  {q.topic && q.topic !== 'general' && (
                    <span className="badge bg-ink-700/60 text-ink-300 border border-ink-600/40">{q.topic}</span>
                  )}
                </div>

                {/* Edit mode */}
                {editIdx === idx ? (
                  <div className="space-y-3">
                    <textarea
                      className="input-field resize-none"
                      rows={3}
                      value={editForm.question}
                      onChange={e => setEditForm({ ...editForm, question: e.target.value })}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label-text">Type</label>
                        <select className="select-field" value={editForm.type}
                          onChange={e => setEditForm({ ...editForm, type: e.target.value })}>
                          <option value="mcq">MCQ</option>
                          <option value="fill_blank">Fill Blank</option>
                        </select>
                      </div>
                      <div>
                        <label className="label-text">Difficulty</label>
                        <select className="select-field" value={editForm.difficulty}
                          onChange={e => setEditForm({ ...editForm, difficulty: e.target.value })}>
                          <option value="easy">Easy</option>
                          <option value="medium">Medium</option>
                          <option value="hard">Hard</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="label-text">Correct Answer</label>
                      <input className="input-field" value={editForm.correct_answer}
                        onChange={e => setEditForm({ ...editForm, correct_answer: e.target.value })} />
                    </div>
                    {editForm.type === 'mcq' && editForm.options && (
                      <div>
                        <label className="label-text">Options</label>
                        <div className="grid grid-cols-2 gap-2">
                          {editForm.options.map((opt, oi) => (
                            <div key={oi} className="flex items-center gap-2">
                              <span className="w-7 h-7 rounded-lg bg-ink-700 flex items-center justify-center text-xs font-semibold text-ink-400 flex-shrink-0 font-display">
                                {String.fromCharCode(65 + oi)}
                              </span>
                              <input className="input-field" value={opt}
                                onChange={e => {
                                  const opts = [...editForm.options];
                                  opts[oi] = e.target.value;
                                  setEditForm({ ...editForm, options: opts });
                                }} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2 pt-1">
                      <button onClick={saveEdit} className="btn-primary text-xs !px-4 !py-2">
                        <RiCheckLine /> Save
                      </button>
                      <button onClick={cancelEdit} className="btn-secondary text-xs !px-4 !py-2">
                        <RiCloseLine /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Read mode */
                  <>
                    <p className="text-ink-100 text-sm font-body leading-relaxed">{q.question}</p>

                    {q.type === 'mcq' && q.options && (
                      <div className="grid grid-cols-2 gap-2">
                        {q.options.map((opt, oi) => (
                          <div key={oi} className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-body
                            ${opt === q.correct_answer
                              ? 'border-volt-500/30 bg-volt-500/10 text-volt-300'
                              : 'border-ink-700/50 text-ink-300'}`}>
                            <span className="font-display font-bold text-xs text-ink-500">{String.fromCharCode(65 + oi)}</span>
                            {opt}
                          </div>
                        ))}
                      </div>
                    )}

                    {q.type !== 'mcq' && (
                      <p className="text-xs text-ink-400 font-body">
                        Answer: <span className="text-volt-400 font-semibold">{q.correct_answer}</span>
                      </p>
                    )}

                    {/* Edit button */}
                    <button
                      onClick={() => startEdit(idx)}
                      className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center
                                 text-ink-500 hover:text-volt-400 hover:bg-volt-500/10 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <RiEditLine className="text-lg" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
