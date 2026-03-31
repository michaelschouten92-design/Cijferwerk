'use client';

import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

interface ToastMessage {
  id: number;
  text: string;
  type: 'success' | 'error';
}

const ToastContext = createContext<{ toast: (text: string, type?: 'success' | 'error') => void }>({
  toast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const toast = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setMessages(prev => [...prev, { id, text, type }]);
    if (type === 'success') {
      setTimeout(() => setMessages(prev => prev.filter(m => m.id !== id)), 3000);
    }
  }, []);

  function dismiss(id: number) {
    setMessages(prev => prev.filter(m => m.id !== id));
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
        {messages.map(m => (
          <div key={m.id}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm animate-in ${
              m.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
            }`}>
            {m.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span className="flex-1">{m.text}</span>
            <button onClick={() => dismiss(m.id)} className="shrink-0 opacity-70 hover:opacity-100">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
