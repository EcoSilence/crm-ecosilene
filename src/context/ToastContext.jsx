import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={18} color="var(--color-basil)" />;
      case 'error':
        return <AlertCircle size={18} color="var(--color-tomato)" />;
      case 'warning':
        return <AlertTriangle size={18} color="var(--color-banana)" />;
      default:
        return <Info size={18} color="var(--accent-primary)" />;
    }
  };

  const getBorderColor = (type) => {
    switch (type) {
      case 'success':
        return 'var(--color-basil)';
      case 'error':
        return 'var(--color-tomato)';
      case 'warning':
        return 'var(--color-banana)';
      default:
        return 'var(--accent-primary)';
    }
  };

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      
      {/* Toast Portal Container */}
      <div 
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          width: '100%',
          maxWidth: '380px',
          pointerEvents: 'none'
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              display: 'flex',
              alignItems: 'start',
              gap: '12px',
              padding: '1rem',
              background: 'rgba(23, 25, 35, 0.85)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderLeft: `4px solid ${getBorderColor(toast.type)}`,
              borderRadius: '8px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4)',
              color: 'var(--text-main)',
              pointerEvents: 'auto',
              animation: 'toast-slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
              fontFamily: 'inherit'
            }}
          >
            <div style={{ marginTop: '2px' }}>{getIcon(toast.type)}</div>
            <div style={{ flex: 1, fontSize: '0.9rem', lineHeight: '1.4', fontWeight: 500 }}>
              {toast.message}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0.7,
                transition: 'opacity 0.2s',
                outline: 'none'
              }}
              onMouseOver={(e) => (e.currentTarget.style.opacity = 1)}
              onMouseOut={(e) => (e.currentTarget.style.opacity = 0.7)}
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

      {/* Add Toast Keyframes styling dynamically */}
      <style>{`
        @keyframes toast-slide-in {
          from {
            transform: translateX(120%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
