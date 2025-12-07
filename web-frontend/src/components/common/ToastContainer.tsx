import React, { useEffect, useState, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastData {
  id: string;
  type: ToastType;
  message: string;
  subtext?: string;
  timeout?: number; // ms
}

const typeClasses: Record<ToastType, { bg: string; text: string; border: string; icon: JSX.Element }> = {
  success: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    icon: (
      <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  error: {
    bg: 'bg-red-50',
    text: 'text-red-800',
    border: 'border-red-200',
    icon: (
      <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M4.93 4.93l14.14 14.14M12 3a9 9 0 100 18 9 9 0 000-18z" />
      </svg>
    ),
  },
  info: {
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    border: 'border-blue-200',
    icon: (
      <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
      </svg>
    ),
  },
  warning: {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    icon: (
      <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
    ),
  },
};

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<Partial<ToastData>>;
      const { type = 'info', message = '', subtext, timeout = 3500 } = ce.detail || {};
      if (!message) return;
      const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const toast: ToastData = { id, type: type as ToastType, message, subtext, timeout };
      setToasts((prev) => [...prev, toast]);
      window.setTimeout(() => remove(id), timeout);
    };

    window.addEventListener('toast', handler as EventListener);
    return () => window.removeEventListener('toast', handler as EventListener);
  }, [remove]);

  return (
    <div className="fixed bottom-4 right-4 z-[200] space-y-2 w-80">
      {toasts.map((t) => {
        const style = typeClasses[t.type];
        return (
          <div key={t.id} className={`flex items-start gap-2 p-3 rounded-lg border shadow-sm ${style.bg} ${style.border}`}>
            <div className="mt-0.5">{style.icon}</div>
            <div className="flex-1">
              <div className={`text-sm font-bold ${style.text}`}>{t.message}</div>
              {t.subtext && <div className="text-xs text-slate-500 mt-0.5">{t.subtext}</div>}
            </div>
            <button onClick={() => remove(t.id)} className="text-slate-400 hover:text-slate-600">
              <svg className="w-4 h-4" viewBox="0 0 24 24" stroke="currentColor" fill="none">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default ToastContainer;


