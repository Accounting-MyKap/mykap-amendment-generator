import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  showToast: (t: Omit<Toast, 'id'>) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

const CONFIG: Record<ToastType, { icon: React.ReactNode; border: string; bg: string; title: string; message: string }> = {
  success: {
    icon: <CheckCircle size={18} />,
    border: 'border-l-emerald-500',
    bg: 'bg-emerald-50',
    title: 'text-emerald-900',
    message: 'text-emerald-700',
  },
  error: {
    icon: <AlertCircle size={18} />,
    border: 'border-l-red-500',
    bg: 'bg-red-50',
    title: 'text-red-900',
    message: 'text-red-700',
  },
  warning: {
    icon: <AlertTriangle size={18} />,
    border: 'border-l-amber-500',
    bg: 'bg-amber-50',
    title: 'text-amber-900',
    message: 'text-amber-700',
  },
  info: {
    icon: <Info size={18} />,
    border: 'border-l-blue-500',
    bg: 'bg-blue-50',
    title: 'text-blue-900',
    message: 'text-blue-700',
  },
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const cfg = CONFIG[toast.type];
  return (
    <div
      className={`flex items-start gap-3 rounded-lg border border-slate-200 border-l-4 shadow-md px-4 py-3 w-full ${cfg.bg} ${cfg.border}`}
    >
      <span className={`mt-0.5 shrink-0 ${cfg.title}`}>{cfg.icon}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold leading-tight ${cfg.title}`}>{toast.title}</p>
        {toast.message && (
          <p className={`text-xs mt-0.5 ${cfg.message}`}>{toast.message}</p>
        )}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors mt-0.5"
      >
        <X size={14} />
      </button>
    </div>
  );
}

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]">
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = crypto.randomUUID();
    setToasts(prev => {
      const next = [...prev, { ...t, id }];
      return next.slice(-4);
    });
    const duration = t.duration ?? 4000;
    if (duration > 0) {
      setTimeout(() => dismissToast(id), duration);
    }
  }, [dismissToast]);

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}
