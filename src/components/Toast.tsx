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
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm animate-slide-in-right backdrop-blur-md overflow-hidden relative ${
              m.type === 'success'
                ? 'bg-white/90 text-green-800 border border-green-200'
                : 'bg-white/90 text-red-800 border border-red-200'
            }`}>
            <div className={`shrink-0 ${m.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>
              {m.type === 'success' ? <CheckCircle className="w-4.5 h-4.5" /> : <AlertCircle className="w-4.5 h-4.5" />}
            </div>
            <span className="flex-1 font-medium">{m.text}</span>
            <button onClick={() => dismiss(m.id)} className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
            {/* Countdown balk */}
            {m.type === 'success' && (
              <div className={`absolute bottom-0 left-0 h-0.5 bg-green-400 animate-progress-countdown`} />
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
