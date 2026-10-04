// ============================================================================
// EduTrack AI v2 - frontend/src/components/ErrorBoundary.jsx
// Captura erros de renderização e impede a "tela branca" completa
// ============================================================================

import React from 'react';
import { AlertCircle, RotateCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary capturou erro]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 p-8 flex items-center justify-center min-h-[50vh]">
          <div className="p-6 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-2xl max-w-lg text-center space-y-4 shadow-xl">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
            <div>
              <h3 className="text-base font-bold text-red-800 dark:text-red-200">
                Ocorreu uma instabilidade ao exibir este painel
              </h3>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                O aplicativo interceptou o erro para proteger sua sessão.
              </p>
            </div>
            {this.state.error?.message && (
              <p className="text-[11px] font-mono bg-red-100 dark:bg-red-900/40 p-2.5 rounded-lg text-left overflow-x-auto text-red-800 dark:text-red-300">
                {this.state.error.message}
              </p>
            )}
            <div className="pt-2 flex justify-center gap-3">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow active:scale-95"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Recarregar tela</span>
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
