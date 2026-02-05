// ========================================
// MODAL DE CONFIRMACIÓN
// ========================================

import { useUIStore } from '../../stores/uiStore';

interface ConfirmarModalProps {
  onClose: () => void;
}

export function ConfirmarModal({ onClose }: ConfirmarModalProps) {
  const confirmData = useUIStore(state => state.confirmData);
  
  if (!confirmData) return null;
  
  const handleConfirmar = () => {
    confirmData.onConfirm();
    onClose();
  };
  
  const handleCancelar = () => {
    confirmData.onCancel?.();
    onClose();
  };
  
  return (
    <div className="modal-overlay" onClick={handleCancelar}>
      <div 
        className="modal-content p-6 w-full max-w-sm mx-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Icono */}
        <div className="text-center mb-4">
          <span className="text-5xl">
            {confirmData.peligroso ? '⚠️' : '❓'}
          </span>
        </div>
        
        {/* Título */}
        <h3 className="text-xl font-bold text-white text-center mb-2">
          {confirmData.titulo}
        </h3>
        
        {/* Mensaje */}
        <p className="text-zinc-400 text-center mb-6">
          {confirmData.mensaje}
        </p>
        
        {/* Botones */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleCancelar}
            className="btn-action-secondary py-4"
          >
            {confirmData.textoCancelar || 'Cancelar'}
          </button>
          <button
            onClick={handleConfirmar}
            className={`btn-action py-4 font-bold ${
              confirmData.peligroso 
                ? 'bg-danger hover:bg-red-700 text-white' 
                : 'bg-primary hover:bg-primary-700 text-white'
            }`}
          >
            {confirmData.textoConfirmar || 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}
