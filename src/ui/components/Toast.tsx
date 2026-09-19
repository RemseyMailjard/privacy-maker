import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastData {
  id: number;
  message: string;
  action?: ToastAction;
  exiting?: boolean;
}

interface ToastContextValue {
  showToast: (message: string, action?: ToastAction) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const idRef = useRef(0);

  const showToast = useCallback((message: string, action?: ToastAction) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, message, action }]);
    // Action-bearing toasts (Undo) stay long enough to actually be used.
    // Timed exits leave the same way they entered: fade + slide toward the bottom edge.
    setTimeout(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 200);
    }, action ? 7000 : 3000);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* bottom-32 clears the sticky Redact bar so Undo is never hidden behind it */}
      <div role="status" aria-live="polite" className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 rounded-md bg-[#0078D4] text-[#FFFFFF] px-4 py-3 shadow-[0_8px_16px_rgba(0,0,0,0.24),0_0_2px_rgba(0,0,0,0.2)] animate-toast-in transition-[opacity,transform] duration-200 ease-out ${
              toast.exiting ? 'opacity-0 translate-y-3' : ''
            }`}
          >
            <span className="text-xs font-sans font-medium uppercase tracking-wider">{toast.message}</span>
            {toast.action && (
              <button
                onClick={() => {
                  toast.action!.onClick();
                  dismiss(toast.id);
                }}
                className="text-xs font-sans font-bold uppercase tracking-wider text-[#FFFFFF] underline decoration-2 underline-offset-2 hover:decoration-[#FFFFFF]/60 transition-colors cursor-pointer ml-2"
              >
                {toast.action.label}
              </button>
            )}
            <button
              onClick={() => dismiss(toast.id)}
              className="text-[#FFFFFF]/50 hover:text-[#FFFFFF] transition-colors cursor-pointer ml-1"
              aria-label="Dismiss"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
