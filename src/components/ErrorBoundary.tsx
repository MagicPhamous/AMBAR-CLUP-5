import React, { ErrorInfo, ReactNode } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  override props: Props;
  override state: State;

  constructor(props: Props) {
    super(props);
    this.props = props;
    this.state = {
      hasError: false
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in component tree:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-zinc-950 border border-zinc-900 rounded-2xl p-8 text-center space-y-6 shadow-2xl">
            <div className="w-16 h-16 bg-red-950/40 border border-red-900/30 rounded-full flex items-center justify-center mx-auto text-red-500">
              <AlertTriangle className="w-8 h-8 animate-pulse" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-lg font-mono font-bold tracking-wider uppercase text-white">
                Ocurrió un error inesperado
              </h2>
              <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                Ocurrió un error inesperado, recarga la página. Si el problema persiste, contacta al soporte técnico.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-zinc-900/50 border border-zinc-800/50 rounded-lg text-[10px] font-mono text-zinc-400 text-left overflow-x-auto max-h-24">
                {this.state.error.toString()}
              </div>
            )}

            <button
              onClick={this.handleReload}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-mono font-bold bg-amber-500 hover:bg-amber-600 text-black transition-all cursor-pointer shadow-lg shadow-amber-950/50"
            >
              <RefreshCw className="w-4 h-4" />
              Recargar la Página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
export default ErrorBoundary;
