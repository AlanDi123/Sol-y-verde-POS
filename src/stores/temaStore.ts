// ========================================
// STORE DE TEMA - ZUSTAND
// Manejo de tema claro/oscuro
// ========================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Tema = 'light' | 'dark';

interface TemaState {
  tema: Tema;
  cambiarTema: (nuevoTema: Tema) => void;
  toggleTema: () => void;
}

export const useTemaStore = create<TemaState>()(
  persist(
    (set) => ({
      tema: 'light',
      
      cambiarTema: (nuevoTema: Tema) => {
        set({ tema: nuevoTema });
        aplicarTema(nuevoTema);
      },
      
      toggleTema: () => {
        set((state) => {
          const nuevoTema = state.tema === 'light' ? 'dark' : 'light';
          aplicarTema(nuevoTema);
          return { tema: nuevoTema };
        });
      },
    }),
    {
      name: 'sol-y-verde-tema',
      onRehydrateStorage: () => (state) => {
        if (state) {
          aplicarTema(state.tema);
        }
      },
    }
  )
);

/**
 * Aplica el tema al documento HTML
 */
function aplicarTema(tema: Tema) {
  if (tema === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}

// Exportar hook para obtener solo el tema actual
export const useTemaActual = () => useTemaStore((state) => state.tema);
