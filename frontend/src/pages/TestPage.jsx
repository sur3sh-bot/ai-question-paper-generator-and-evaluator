import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import {
  RiCheckLine, RiArrowLeftLine, RiArrowRightLine,
  RiSendPlane2Line, RiAlertLine,
} from 'react-icons/ri';
import { testsApi } from '../services/api';
import Timer from '../components/Timer';
import { PageLoader } from '../components/Spinner';
import Toast from '../components/Toast';

export default function TestPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const timeLimit = location.state?.timeLimit || 30;

  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState({});
  const [current, setCurrent] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const autoSubmittedRef = useRef(false);

  const showToast = (message, type = 'success') => setToast({ message, type });

  useEffect(() => {
    async function fetchTest() {
      try {
        const data = await testsApi.getById(id);
        setTest(data);
      } catch (err) {
        showToast(err.message || 'Failed to load test', 'error');
      } finally {
        setLoading(false);
      }
    }
    fetchTest();
  }, [id]);

  async function handleSubmit(auto = false) {
    if (autoSubmittedRef.current) return;
    const questions = test?.questions || [];
    const unanswered = questions.filter((_, i) => {
      const qId = questions[i].id ?? i;
      return !answers[qId] || !String(answers[qId]).trim();
    });

    if (!auto && unanswered.length > 0 && !confirmSubmit) {
      setConfirmSubmit(true);
      return;
    }

    autoSubmittedRef.current = true;
    setSubmitting(true);
    try {
      const result = await testsApi.submit(id, answers);
      navigate('/results', { state: { result, testId: id } });
    } catch (err) {
      showToast(err.message || 'Failed to submit test', 'error');
      setSubmitting(false);
      autoSubmittedRef.current = false;
    }
  }

  function handleTimerExpire() {
    showToast('Time is up! Submitting automatically...', 'error');
    setTimeout(() => handleSubmit(true), 1500);
  }

  if (loading) return <PageLoader text="Loading test..." />;
  if (!test) return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
      <RiAlertLine className="text-4xl text-ember-400" />
      <p className="font-display text-lg text-ink-300">Test not found</p>
      <button className="btn-secondary" onClick={() => navigate('/generate-test')}>
        <RiArrowLeftLine /> Generate New Test
      </button>
    </div>
  );

  const questions = test.questions || [];
  const totalQ = questions.length;
  const answeredCount = Object.values(answers).filter(v => v && String(v).trim()).length;
  const currentQ = questions[current];
  const currentQId = currentQ?.id ?? current;
  const qType = (currentQ?.type || currentQ?.question_type || 'mcq').toLowerCase();
  const opts = currentQ?.options || [];
  const letters = ['A', 'B', 'C', 'D'];

  const progressPct = totalQ > 0 ? (answeredCount / totalQ) * 100 : 0;
  const subjects = [...new Set(questions.map(q => q.subject).filter(Boolean))];
  const testTitle = subjects.length === 1 ? subjects[0] : subjects.length > 1 ? 'Mixed Subjects' : 'Test';

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-in">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Test Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-50">
            {testTitle}
          </h1>
          <p className="text-ink-500 text-sm font-body">
            {answeredCount}/{totalQ} answered
          </p>
        </div>
        <Timer durationMinutes={timeLimit} onExpire={handleTimerExpire} />
      </div>

      {/* Progress Bar */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between text-xs text-ink-500 font-body mb-2">
          <span>Progress</span>
          <span className="font-semibold text-ink-300">{Math.round(progressPct)}%</span>
        </div>
        <div className="h-1.5 bg-ink-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-volt-500 rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Question pills */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {questions.map((q, idx) => {
            const qid = q.id ?? idx;
            const isAnswered = answers[qid] && String(answers[qid]).trim();
            const isCurrent = idx === current;
            return (
              <button
                key={idx}
                onClick={() => setCurrent(idx)}
                className={`w-7 h-7 rounded-lg text-xs font-display font-semibold transition-all duration-150
                  ${isCurrent
                    ? 'bg-volt-500 text-ink-950 scale-110'
                    : isAnswered
                      ? 'bg-volt-500/20 text-volt-400 border border-volt-500/30'
                      : 'bg-ink-700 text-ink-500 hover:bg-ink-600 hover:text-ink-300'
                  }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Question Card */}
      {currentQ && (
        <div className="glass-card p-6 space-y-5 animate-slide-up" key={current}>
          {/* Question Meta */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="badge bg-ink-700/60 text-ink-400 border border-ink-600/50 font-mono">
              Q{current + 1}/{totalQ}
            </span>
            {currentQ.difficulty && (
              <span className={`badge-${(currentQ.difficulty || 'easy').toLowerCase()}`}>
                {currentQ.difficulty}
              </span>
            )}
            <span className={qType === 'mcq' ? 'badge-mcq' : 'badge-fill'}>
              {qType === 'mcq' ? 'MCQ' : 'Fill Blank'}
            </span>
          </div>

          {/* Question Text */}
          <p className="font-body text-base text-ink-100 leading-relaxed">
            {currentQ.question || currentQ.text}
          </p>

          {/* Answer Input */}
          {qType === 'mcq' ? (
            <div className="space-y-2">
              {(Array.isArray(opts) ? opts : []).map((opt, idx) => {
                const optText = typeof opt === 'string' ? opt : String(opt);
                const selected = answers[currentQId] === optText || answers[currentQId] === letters[idx];
                return (
                  <button
                    key={idx}
                    onClick={() => setAnswers(a => ({ ...a, [currentQId]: letters[idx] }))}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left
                                transition-all duration-200 font-body text-sm
                                ${selected
                                  ? 'border-volt-500/60 bg-volt-500/12 text-volt-300'
                                  : 'border-ink-700/50 bg-ink-800/40 text-ink-300 hover:border-ink-500 hover:bg-ink-700/50'
                                }`}
                  >
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-semibold
                                     flex-shrink-0 font-display transition-colors
                                     ${selected ? 'bg-volt-500 text-ink-950' : 'bg-ink-700 text-ink-400'}`}>
                      {selected ? <RiCheckLine /> : letters[idx]}
                    </div>
                    <span className="flex-1">{optText}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div>
              <label className="label-text">Your Answer</label>
              <input
                className="input-field text-base"
                placeholder="Type your answer here..."
                value={answers[currentQId] || ''}
                onChange={e => setAnswers(a => ({ ...a, [currentQId]: e.target.value }))}
              />
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3">
        <button
          className="btn-secondary"
          onClick={() => setCurrent(c => Math.max(0, c - 1))}
          disabled={current === 0}
        >
          <RiArrowLeftLine /> Previous
        </button>

        <div className="flex items-center gap-2">
          {current < totalQ - 1 ? (
            <button
              className="btn-primary"
              onClick={() => setCurrent(c => Math.min(totalQ - 1, c + 1))}
            >
              Next <RiArrowRightLine />
            </button>
          ) : (
            <button
              className="btn-primary"
              onClick={() => handleSubmit(false)}
              disabled={submitting}
            >
              {submitting ? (
                <span className="w-4 h-4 border-2 border-ink-950/30 border-t-ink-950 rounded-full animate-spin" />
              ) : <RiSendPlane2Line />}
              {submitting ? 'Submitting...' : 'Submit Test'}
            </button>
          )}
        </div>
      </div>

      {/* Confirm Submit Modal */}
      {confirmSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm" onClick={() => setConfirmSubmit(false)} />
          <div className="relative glass-card p-6 max-w-sm w-full space-y-4 animate-slide-up">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30
                              flex items-center justify-center">
                <RiAlertLine className="text-amber-400 text-lg" />
              </div>
              <div>
                <h3 className="font-display font-600 text-ink-100">Unanswered Questions</h3>
                <p className="text-xs text-ink-500 font-body">
                  {totalQ - answeredCount} question(s) left unanswered
                </p>
              </div>
            </div>
            <p className="text-sm text-ink-400 font-body">
              You still have unanswered questions. Are you sure you want to submit?
            </p>
            <div className="flex gap-2">
              <button className="btn-secondary flex-1 justify-center" onClick={() => setConfirmSubmit(false)}>
                Go Back
              </button>
              <button
                className="btn-primary flex-1 justify-center"
                onClick={() => { setConfirmSubmit(false); handleSubmit(true); }}
                disabled={submitting}
              >
                Submit Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

