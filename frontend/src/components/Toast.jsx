import { useEffect } from 'react';
import { RiCheckLine, RiCloseLine, RiErrorWarningLine } from 'react-icons/ri';

export default function Toast({ message, type = 'success', onClose, duration = 3500 }) {
  useEffect(() => {
    const timer = setTimeout(() => onClose?.(), duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div className={type === 'success' ? 'toast-success' : 'toast-error'}>
      {type === 'success'
        ? <RiCheckLine className="text-base flex-shrink-0" />
        : <RiErrorWarningLine className="text-base flex-shrink-0" />
      }
      <span className="font-body text-sm">{message}</span>
      <button
        onClick={onClose}
        className="ml-2 opacity-60 hover:opacity-100 transition-opacity"
      >
        <RiCloseLine className="text-base" />
      </button>
    </div>
  );
}