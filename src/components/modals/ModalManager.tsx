// ========================================
// GESTOR DE MODALES
// ========================================

import { useUIStore } from '../../stores/uiStore';
import { NumpadModal } from './NumpadModal';
import { PagoModal } from './PagoModal';
import { DevolucionEnvasesModal } from './DevolucionEnvasesModal';
import { ValeModal } from './ValeModal';
import { GastoModal } from './GastoModal';
import { CierreCajaModal } from './CierreCajaModal';
import { ConfiguracionModal } from './ConfiguracionModal';
import { ConfirmarModal } from './ConfirmarModal';

export function ModalManager() {
  const modalActivo = useUIStore(state => state.modalActivo);
  const cerrarModal = useUIStore(state => state.cerrarModal);
  
  if (modalActivo === 'none') {
    return null;
  }
  
  // Renderizar el modal correspondiente
  switch (modalActivo) {
    case 'numpad':
      return <NumpadModal onClose={cerrarModal} />;
    
    case 'pago':
      return <PagoModal onClose={cerrarModal} />;
    
    case 'devolucion-envases':
      return <DevolucionEnvasesModal onClose={cerrarModal} />;
    
    case 'vale':
      return <ValeModal onClose={cerrarModal} />;
    
    case 'gasto':
      return <GastoModal onClose={cerrarModal} />;
    
    case 'cierre-caja':
      return <CierreCajaModal onClose={cerrarModal} />;
    
    case 'configuracion':
      return <ConfiguracionModal onClose={cerrarModal} />;
    
    case 'confirmar':
      return <ConfirmarModal onClose={cerrarModal} />;
    
    default:
      return null;
  }
}
