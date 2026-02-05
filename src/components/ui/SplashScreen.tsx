// ========================================
// SPLASH SCREEN - PANTALLA DE CARGA
// ========================================

export function SplashScreen() {
  return (
    <div className="min-h-screen bg-dark-400 flex flex-col items-center justify-center">
      {/* Logo animado */}
      <div className="text-7xl mb-6 animate-bounce">
        🥬
      </div>
      
      {/* Nombre */}
      <h1 className="text-3xl font-bold text-white mb-2">
        Sol y Verde
      </h1>
      <p className="text-zinc-400 text-lg mb-8">
        Sistema POS
      </p>
      
      {/* Spinner de carga */}
      <div className="relative">
        <div className="w-12 h-12 border-4 border-dark-200 border-t-primary rounded-full animate-spin"></div>
      </div>
      
      {/* Mensaje */}
      <p className="text-zinc-500 text-sm mt-6">
        Cargando datos...
      </p>
    </div>
  );
}
