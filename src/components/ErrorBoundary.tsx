// ========================================
// ERROR BOUNDARY - MANEJO DE ERRORES CRÍTICOS
// ========================================

import { Component, ErrorInfo, ReactNode } from 'react';
import { descargarBackup } from '../db/database';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturó un error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleDownloadBackup = async () => {
    try {
      await descargarBackup();
    } catch (err) {
      console.error('Error descargando backup:', err);
      alert('No se pudo descargar el backup');
    }
  };

  private handleForzarSync = () => {
    // Intentar sincronización forzada
    localStorage.setItem('forzar_sync', 'true');
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-dark-400 flex items-center justify-center p-4">
          <div className="bg-dark-300 rounded-2xl p-8 max-w-lg w-full shadow-xl">
            {/* Icono de error */}
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">🔧</div>
              <h1 className="text-2xl font-bold text-white mb-2">
                Algo salió mal
              </h1>
              <p className="text-zinc-400">
                Ha ocurrido un error inesperado. Tus datos están seguros.
              </p>
            </div>

            {/* Información del error (colapsable) */}
            {this.state.error && (
              <details className="mb-6 bg-dark-400 rounded-lg p-4">
                <summary className="text-zinc-400 cursor-pointer hover:text-white">
                  Ver detalles técnicos
                </summary>
                <div className="mt-3 text-sm font-mono text-danger overflow-auto max-h-40">
                  <p className="font-bold">{this.state.error.toString()}</p>
                  {this.state.errorInfo && (
                    <pre className="mt-2 text-xs text-zinc-500 whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            )}

            {/* Acciones */}
            <div className="space-y-3">
              {/* Botón principal: Recargar */}
              <button
                onClick={this.handleReload}
                className="w-full bg-primary hover:bg-primary-700 text-white 
                         font-semibold py-4 px-6 rounded-xl transition-all
                         flex items-center justify-center gap-2"
              >
                <span className="text-xl">🔄</span>
                Recargar Aplicación
              </button>

              {/* Botón secundario: Descargar backup */}
              <button
                onClick={this.handleDownloadBackup}
                className="w-full bg-dark-200 hover:bg-dark-100 text-white 
                         font-semibold py-4 px-6 rounded-xl transition-all
                         flex items-center justify-center gap-2"
              >
                <span className="text-xl">💾</span>
                Descargar Backup JSON
              </button>

              {/* Botón terciario: Forzar sincronización */}
              <button
                onClick={this.handleForzarSync}
                className="w-full bg-dark-200 hover:bg-dark-100 text-zinc-400 
                         font-medium py-3 px-6 rounded-xl transition-all
                         flex items-center justify-center gap-2 text-sm"
              >
                <span>☁️</span>
                Forzar Sincronización
              </button>
            </div>

            {/* Mensaje de ayuda */}
            <p className="text-center text-xs text-zinc-500 mt-6">
              Si el problema persiste, descarga el backup y contacta soporte técnico.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
