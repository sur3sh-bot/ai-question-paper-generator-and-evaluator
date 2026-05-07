import { RiDeleteBinLine, RiCheckboxCircleLine, RiQuestionLine } from 'react-icons/ri';

const difficultyBadge = {
  easy: 'badge-easy',
  medium: 'badge-medium',
  hard: 'badge-hard',
};

const typeBadge = {
  mcq: 'badge-mcq',
  fill_blank: 'badge-fill',
  fill: 'badge-fill',
};

const typeLabel = {
  mcq: 'MCQ',
  fill_blank: 'Fill Blank',
  fill: 'Fill Blank',
};

export default function QuestionCard({ question, onDelete, showActions = true }) {
  const diff = (question.difficulty || 'easy').toLowerCase();
  const type = (question.type || question.question_type || 'mcq').toLowerCase();

  return (
    <div className="glass-card-hover p-5 group animate-fade-in">
      {/* Header Row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={difficultyBadge[diff] || 'badge-easy'}>
            {(question.difficulty || 'Easy')}
          </span>
          <span className={typeBadge[type] || 'badge-mcq'}>
            {typeLabel[type] || 'MCQ'}
          </span>
          {question.id && (
            <span className="badge bg-ink-700/60 text-ink-400 border border-ink-600/50">
              #{question.id}
            </span>
          )}
        </div>

        {showActions && onDelete && (
          <button
            onClick={() => onDelete(question.id)}
            className="btn-danger opacity-0 group-hover:opacity-100 transition-all duration-200
                       !px-2.5 !py-1.5 text-xs"
            title="Delete question"
          >
            <RiDeleteBinLine className="text-sm" />
          </button>
        )}
      </div>

      {/* Question Text */}
      <p className="text-ink-100 text-sm leading-relaxed mb-4 font-body">
        <RiQuestionLine className="inline mr-1.5 text-volt-500 relative -top-px" />
        {question.question || question.text}
      </p>

      {/* Options (MCQ) */}
      {type === 'mcq' && question.options && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
          {(Array.isArray(question.options) ? question.options : Object.entries(question.options).map(([k, v]) => `${k}: ${v}`))
            .map((opt, idx) => {
              const optText = typeof opt === 'string' ? opt : `${opt}`;
              const letters = ['A', 'B', 'C', 'D'];
              const isCorrect =
                question.correct_answer === optText ||
                question.correct_answer === letters[idx] ||
                question.correct_answer === idx;

              return (
                <div
                  key={idx}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs border transition-colors
                    ${isCorrect
                      ? 'bg-volt-500/10 border-volt-500/30 text-volt-400'
                      : 'bg-ink-800/40 border-ink-700/30 text-ink-400'
                    }`}
                >
                  <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-semibold flex-shrink-0
                    ${isCorrect ? 'bg-volt-500/20 text-volt-400' : 'bg-ink-700 text-ink-400'}`}>
                    {letters[idx]}
                  </span>
                  <span className="font-body leading-relaxed">{optText}</span>
                  {isCorrect && <RiCheckboxCircleLine className="ml-auto text-volt-400 flex-shrink-0" />}
                </div>
              );
            })
          }
        </div>
      )}

      {/* Fill Blank Answer */}
      {(type === 'fill_blank' || type === 'fill') && question.correct_answer && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-volt-500/8 border border-volt-500/20 text-xs">
          <RiCheckboxCircleLine className="text-volt-400 flex-shrink-0" />
          <span className="text-ink-400">Answer:</span>
          <span className="text-volt-400 font-semibold">{question.correct_answer}</span>
        </div>
      )}
    </div>
  );
}