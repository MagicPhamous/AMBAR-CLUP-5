import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, ShieldAlert } from 'lucide-react';

interface AlertState {
  isOpen: boolean;
  message: string;
  title?: string;
  type?: 'warning' | 'error' | 'success' | 'info';
}

let globalSetAlert: ((alert: AlertState) => void) | null = null;

/**
 * Trigger a custom modal alert programmatically
 */
export function showCustomAlert(message: string, title?: string, type?: 'warning' | 'error' | 'success' | 'info') {
  if (globalSetAlert) {
    let autoType = type;
    if (!autoType) {
      const lower = message.toLowerCase();
      if (lower.includes('éxito') || lower.includes('exitosamente') || lower.includes('🎉') || lower.includes('aprobada') || lower.includes('guardada')) {
        autoType = 'success';
      } else if (lower.includes('error') || lower.includes('insuficiente') || lower.includes('denegado') || lower.includes('falta')) {
        autoType = 'error';
      } else if (lower.includes('apertura') || lower.includes('alerta') || lower.includes('requiere') || lower.includes('atención') || lower.includes('debe')) {
        autoType = 'warning';
      } else {
        autoType = 'info';
      }
    }
    const alertData = {
      isOpen: true,
      message,
      title: title || (autoType === 'error' ? 'Atención / Error' : autoType === 'warning' ? 'Aviso del Sistema' : autoType === 'success' ? 'Operación Exitosa' : 'Información'),
      type: autoType
    };
    setTimeout(() => {
      if (globalSetAlert) {
        globalSetAlert(alertData);
      }
    }, 0);
  } else {
    console.log('[Alert]:', message);
  }
}

// Override native window.alert so all existing alert() calls use the custom popup modal
if (typeof window !== 'undefined') {
  window.alert = (message?: any) => {
    const msgStr = String(message ?? '');
    showCustomAlert(msgStr);
  };
}

export function CustomAlertModal() {
  const [alertState, setAlertState] = useState<AlertState>({
    isOpen: false,
    message: '',
  });

  useEffect(() => {
    globalSetAlert = setAlertState;
    return () => {
      globalSetAlert = null;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (alertState.isOpen && (e.key === 'Escape' || e.key === 'Enter')) {
        setAlertState(prev => ({ ...prev, isOpen: false }));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [alertState.isOpen]);

  if (!alertState.isOpen) return null;

  const getIcon = () => {
    switch (alertState.type) {
      case 'success':
        return <CheckCircle2 className="w-8 h-8 text-emerald-400" />;
      case 'error':
        return <ShieldAlert className="w-8 h-8 text-red-400 animate-pulse" />;
      case 'warning':
        return <AlertTriangle className="w-8 h-8 text-amber-400 animate-bounce" />;
      case 'info':
      default:
        return <Info className="w-8 h-8 text-cyan-400" />;
    }
  };

  const getHeaderBadge = () => {
    switch (alertState.type) {
      case 'success':
        return 'bg-emerald-950/60 border-emerald-800/80 text-emerald-400';
      case 'error':
        return 'bg-red-950/60 border-red-800/80 text-red-400';
      case 'warning':
        return 'bg-amber-950/60 border-amber-800/80 text-amber-400';
      case 'info':
      default:
        return 'bg-zinc-900 border-zinc-800 text-zinc-300';
    }
  };

  const getButtonBg = () => {
    switch (alertState.type) {
      case 'success':
        return 'bg-emerald-600 hover:bg-emerald-500 text-black shadow-emerald-950/50';
      case 'error':
        return 'bg-red-600 hover:bg-red-500 text-white shadow-red-950/50';
      case 'warning':
        return 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-950/50';
      case 'info':
      default:
        return 'bg-zinc-800 hover:bg-zinc-700 text-white shadow-zinc-950/50';
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-[99999] flex items-center justify-center p-4 animate-fade-in"
      onClick={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
    >
      <div 
        className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 border-amber-500/30"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-2xl border flex items-center justify-center shrink-0 ${getHeaderBadge()}`}>
            {getIcon()}
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-white flex items-center justify-between">
              <span>{alertState.title || 'Aviso del Sistema'}</span>
              <button
                type="button"
                onClick={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
                className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 -mr-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </h3>
            <div className="mt-2 text-xs font-sans text-zinc-200 leading-relaxed whitespace-pre-line bg-zinc-900/80 border border-zinc-800 p-3 rounded-xl font-medium">
              {alertState.message}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="button"
            autoFocus
            onClick={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
            className={`w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-mono font-bold tracking-wider transition-all cursor-pointer shadow-lg ${getButtonBg()}`}
          >
            ENTENDIDO
          </button>
        </div>
      </div>
    </div>
  );
}
