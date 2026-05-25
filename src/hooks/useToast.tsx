import React, { createContext, useContext, useCallback, useState, useRef } from 'react';

interface ToastCtx {
  showToast: (message: string) => void;
}

const ToastContext = createContext<ToastCtx>({ showToast: () => {} });
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{ message: string; out: boolean } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const showToast = useCallback((message: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ message, out: false });
    timerRef.current = setTimeout(() => {
      setToast(prev => prev ? { ...prev, out: true } : null);
      setTimeout(() => setToast(null), 300);
    }, 2500);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <div className={`toast${toast.out ? ' out' : ''}`}>{toast.message}</div>
      )}
    </ToastContext.Provider>
  );
}
