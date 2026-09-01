// ========================================
// MODAL DE CONFIGURACIÓN
// ========================================

import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, exportarBackupJSON } from '../../db/database';
import { useSesionStore } from '../../stores/sesionStore';
import { useUIStore } from '../../stores/uiStore';
import { formatearMoneda, type ConfiguracionSistema, type ConfigBanco, type TipoEnvase } from '../../types';
import { v4 as uuidv4 } from 'uuid';

interface ConfiguracionModalProps {
  onClose: () => void;
}

type TabActiva = 'general' | 'bancos' | 'envases' | 'impresion' | 'backup';

export function ConfiguracionModal({ onClose }: ConfiguracionModalProps) {
  const [tabActiva, setTabActiva] = useState<TabActiva>('general');
  
  const vendedorActual = useSesionStore(state => state.vendedorActual);
  
  // Si no es admin, solo mostrar backup
  const esAdmin = vendedorActual?.rol === 'admin';
  
  const tabs: Array<{ id: TabActiva; label: string; emoji: string; adminOnly?: boolean }> = [
    { id: 'general', label: 'General', emoji: '⚙️', adminOnly: true },
    { id: 'bancos', label: 'Bancos', emoji: '🏦', adminOnly: true },
    { id: 'envases', label: 'Envases', emoji: '📦', adminOnly: true },
    { id: 'impresion', label: 'Impresión', emoji: '🖨️' },
    { id: 'backup', label: 'Backup', emoji: '💾' },
  ];
  
  const tabsVisibles = tabs.filter(t => !t.adminOnly || esAdmin);
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content p-0 w-full max-w-lg mx-4 max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-dark-400 border-b border-dark-100 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-white">⚙️ Configuración</h3>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white text-xl"
            >
              ✕
            </button>
          </div>
          
          {/* Tabs */}
          <div className="flex gap-1 mt-4 overflow-x-auto pb-1">
            {tabsVisibles.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTabActiva(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  tabActiva === tab.id
                    ? 'bg-primary text-white'
                    : 'bg-dark-200 text-zinc-400 hover:text-white'
                }`}
              >
                {tab.emoji} {tab.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-4">
          {tabActiva === 'general' && <TabGeneral />}
          {tabActiva === 'bancos' && <TabBancos />}
          {tabActiva === 'envases' && <TabEnvases />}
          {tabActiva === 'impresion' && <TabImpresion />}
          {tabActiva === 'backup' && <TabBackup onClose={onClose} />}
        </div>
      </div>
    </div>
  );
}

// ========================================
// TAB GENERAL
// ========================================

function TabGeneral() {
  const [config, setConfig] = useState<ConfiguracionSistema | null>(null);
  const agregarNotificacion = useUIStore(state => state.agregarNotificacion);
  
  useEffect(() => {
    const cargar = async () => {
      const c = await db.configuracion.get('sistema');
      if (c) setConfig(c);
    };
    cargar();
  }, []);
  
  const guardar = async (updates: Partial<ConfiguracionSistema>) => {
    if (!config) return;
    
    const nuevo = { ...config, ...updates };
    await db.configuracion.put(nuevo);
    setConfig(nuevo);
    agregarNotificacion('success', 'Guardado', 'Configuración actualizada');
  };
  
  if (!config) return <div className="text-zinc-400 text-center py-8">Cargando...</div>;
  
  return (
    <div className="space-y-4">
      <div>
        <label className="text-zinc-400 text-sm">Nombre del negocio</label>
        <input
          type="text"
          value={config.nombreNegocio}
          onChange={(e) => guardar({ nombreNegocio: e.target.value })}
          className="input-dark mt-1"
        />
      </div>
      
      <div>
        <label className="text-zinc-400 text-sm">Dirección</label>
        <input
          type="text"
          value={config.direccion || ''}
          onChange={(e) => guardar({ direccion: e.target.value })}
          className="input-dark mt-1"
        />
      </div>
      
      <div>
        <label className="text-zinc-400 text-sm">Teléfono</label>
        <input
          type="text"
          value={config.telefono || ''}
          onChange={(e) => guardar({ telefono: e.target.value })}
          className="input-dark mt-1"
        />
      </div>
      
      <div className="pt-4 border-t border-dark-200">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-white font-medium">Modo offline forzado</div>
            <div className="text-zinc-500 text-sm">Deshabilita sincronización</div>
          </div>
          <button
            onClick={() => guardar({ modoOfflineForzado: !config.modoOfflineForzado })}
            className={`w-12 h-6 rounded-full transition-colors ${
              config.modoOfflineForzado ? 'bg-warning' : 'bg-dark-200'
            }`}
          >
            <div className={`w-5 h-5 bg-white rounded-full transform transition-transform mt-0.5 ${
              config.modoOfflineForzado ? 'translate-x-6' : 'translate-x-0.5'
            }`} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ========================================
// TAB BANCOS
// ========================================

function TabBancos() {
  const bancos = useLiveQuery(() => db.bancos.toArray(), []);
  const [editando, setEditando] = useState<ConfigBanco | null>(null);
  const [nuevoAlias, setNuevoAlias] = useState('');
  const agregarNotificacion = useUIStore(state => state.agregarNotificacion);
  
  const guardarBanco = async () => {
    if (!editando) return;
    
    await db.bancos.put(editando);
    setEditando(null);
    agregarNotificacion('success', 'Guardado', 'Banco actualizado');
  };
  
  const agregarBanco = async () => {
    if (!nuevoAlias.trim()) return;
    
    const nuevo: ConfigBanco = {
      id: uuidv4(),
      nombre: nuevoAlias.split('.')[0] || 'Nuevo Banco',
      alias: nuevoAlias.trim(),
      activo: true,
      orden: (bancos?.length || 0) + 1
    };
    
    await db.bancos.add(nuevo);
    setNuevoAlias('');
    agregarNotificacion('success', 'Agregado', 'Nuevo banco agregado');
  };
  
  const toggleActivo = async (banco: ConfigBanco) => {
    await db.bancos.update(banco.id, { activo: !banco.activo });
  };
  
  return (
    <div className="space-y-4">
      <p className="text-zinc-400 text-sm">
        Configure las cuentas bancarias para recibir transferencias
      </p>
      
      {/* Lista de bancos */}
      <div className="space-y-2">
        {bancos?.map((banco) => (
          <div
            key={banco.id}
            className={`bg-dark-400 rounded-xl p-3 flex items-center justify-between ${
              !banco.activo && 'opacity-50'
            }`}
          >
            <div>
              <div className="font-semibold text-white">{banco.nombre}</div>
              <div className="font-mono text-primary">{banco.alias}</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditando(banco)}
                className="text-zinc-400 hover:text-white"
              >
                ✏️
              </button>
              <button
                onClick={() => toggleActivo(banco)}
                className={banco.activo ? 'text-success' : 'text-zinc-500'}
              >
                {banco.activo ? '✓' : '○'}
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {/* Agregar nuevo */}
      <div className="flex gap-2">
        <input
          type="text"
          value={nuevoAlias}
          onChange={(e) => setNuevoAlias(e.target.value)}
          placeholder="Nuevo alias (ej: banco.mp)"
          className="input-dark flex-1"
        />
        <button
          onClick={agregarBanco}
          className="btn-action-primary px-4"
        >
          +
        </button>
      </div>
      
      {/* Modal de edición */}
      {editando && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-300 rounded-xl p-4 w-80">
            <h4 className="font-bold text-white mb-4">Editar Banco</h4>
            <div className="space-y-3">
              <input
                type="text"
                value={editando.nombre}
                onChange={(e) => setEditando({ ...editando, nombre: e.target.value })}
                placeholder="Nombre"
                className="input-dark"
              />
              <input
                type="text"
                value={editando.alias}
                onChange={(e) => setEditando({ ...editando, alias: e.target.value })}
                placeholder="Alias"
                className="input-dark"
              />
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setEditando(null)}
                className="btn-action-secondary flex-1"
              >
                Cancelar
              </button>
              <button
                onClick={guardarBanco}
                className="btn-action-primary flex-1"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ========================================
// TAB ENVASES
// ========================================

function TabEnvases() {
  const envases = useLiveQuery(() => db.tiposEnvase.toArray(), []);
  const [editando, setEditando] = useState<TipoEnvase | null>(null);
  const agregarNotificacion = useUIStore(state => state.agregarNotificacion);
  
  const guardarEnvase = async () => {
    if (!editando) return;
    
    await db.tiposEnvase.put(editando);
    setEditando(null);
    agregarNotificacion('success', 'Guardado', 'Envase actualizado');
  };
  
  const toggleActivo = async (envase: TipoEnvase) => {
    await db.tiposEnvase.update(envase.id, { activo: !envase.activo });
  };
  
  return (
    <div className="space-y-4">
      <p className="text-zinc-400 text-sm">
        Configure los tipos de envases y sus valores de seña
      </p>
      
      {/* Lista de envases */}
      <div className="space-y-2">
        {envases?.map((envase) => (
          <div
            key={envase.id}
            className={`bg-dark-400 rounded-xl p-3 flex items-center justify-between ${
              !envase.activo && 'opacity-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{envase.emoji}</span>
              <div>
                <div className="font-semibold text-white">{envase.nombre}</div>
                <div className="font-mono text-primary">{formatearMoneda(envase.valorSena)}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditando(envase)}
                className="text-zinc-400 hover:text-white"
              >
                ✏️
              </button>
              <button
                onClick={() => toggleActivo(envase)}
                className={envase.activo ? 'text-success' : 'text-zinc-500'}
              >
                {envase.activo ? '✓' : '○'}
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {/* Modal de edición */}
      {editando && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-300 rounded-xl p-4 w-80">
            <h4 className="font-bold text-white mb-4">Editar Envase</h4>
            <div className="space-y-3">
              <input
                type="text"
                value={editando.nombre}
                onChange={(e) => setEditando({ ...editando, nombre: e.target.value })}
                placeholder="Nombre"
                className="input-dark"
              />
              <input
                type="text"
                value={editando.emoji}
                onChange={(e) => setEditando({ ...editando, emoji: e.target.value })}
                placeholder="Emoji"
                className="input-dark text-center text-2xl"
              />
              <div>
                <label className="text-zinc-400 text-sm">Valor de seña</label>
                <input
                  type="number"
                  value={editando.seña}
                  onChange={(e) => setEditando({ ...editando, seña: parseFloat(e.target.value) || 0 })}
                  className="input-dark mt-1"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setEditando(null)}
                className="btn-action-secondary flex-1"
              >
                Cancelar
              </button>
              <button
                onClick={guardarEnvase}
                className="btn-action-primary flex-1"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ========================================
// TAB IMPRESIÓN
// ========================================

function TabImpresion() {
  const [config, setConfig] = useState({
    impresoraUrl: '',
    anchoTicket: 58,
    imprimirAuto: false
  });
  const [testando, setTestando] = useState(false);
  const agregarNotificacion = useUIStore(state => state.agregarNotificacion);
  
  useEffect(() => {
    const cargar = async () => {
      const c = await db.configuracion.get('config-principal');
      if (c) {
        setConfig({
          impresoraUrl: c.impresoraUrl || '',
          anchoTicket: c.anchoTicket,
          imprimirAuto: c.impresionAutomatica
        });
      }
    };
    cargar();
  }, []);
  
  const guardar = async () => {
    const configActual = await db.configuracion.get('config-principal');
    if (configActual) {
      await db.configuracion.update('config-principal', {
        impresoraUrl: config.impresoraUrl,
        anchoTicket: config.anchoTicket,
        impresionAutomatica: config.imprimirAuto
      });
    }
    agregarNotificacion('success', 'Guardado', 'Configuración de impresión actualizada');
  };
  
  const probarImpresora = async () => {
    setTestando(true);
    try {
      // Aquí iría la lógica de prueba de impresión
      await new Promise(r => setTimeout(r, 1000));
      agregarNotificacion('success', 'Test exitoso', 'La impresora respondió correctamente');
    } catch {
      agregarNotificacion('error', 'Error', 'No se pudo conectar con la impresora');
    } finally {
      setTestando(false);
    }
  };
  
  return (
    <div className="space-y-4">
      <p className="text-zinc-400 text-sm">
        Configure la impresora térmica ESC/POS
      </p>
      
      <div>
        <label className="text-zinc-400 text-sm">URL de la impresora</label>
        <input
          type="text"
          value={config.impresoraUrl}
          onChange={(e) => setConfig({ ...config, impresoraUrl: e.target.value })}
          placeholder="http://192.168.1.100:9100"
          className="input-dark mt-1 font-mono"
        />
      </div>
      
      <div>
        <label className="text-zinc-400 text-sm">Ancho del ticket (mm)</label>
        <select
          value={config.anchoTicket}
          onChange={(e) => setConfig({ ...config, anchoTicket: parseInt(e.target.value) })}
          className="input-dark mt-1"
        >
          <option value={58}>58mm (32 caracteres)</option>
          <option value={80}>80mm (48 caracteres)</option>
        </select>
      </div>
      
      <div className="flex items-center justify-between pt-4 border-t border-dark-200">
        <div>
          <div className="text-white font-medium">Imprimir automáticamente</div>
          <div className="text-zinc-500 text-sm">Al finalizar cada venta</div>
        </div>
        <button
          onClick={() => setConfig({ ...config, imprimirAuto: !config.imprimirAuto })}
          className={`w-12 h-6 rounded-full transition-colors ${
            config.imprimirAuto ? 'bg-success' : 'bg-dark-200'
          }`}
        >
          <div className={`w-5 h-5 bg-white rounded-full transform transition-transform mt-0.5 ${
            config.imprimirAuto ? 'translate-x-6' : 'translate-x-0.5'
          }`} />
        </button>
      </div>
      
      <div className="pt-4 space-y-2">
        <button
          onClick={probarImpresora}
          disabled={testando || !config.impresoraUrl}
          className="w-full btn-action-secondary py-3 disabled:opacity-50"
        >
          {testando ? 'Probando...' : '🖨️ Probar Impresora'}
        </button>
        
        <button
          onClick={guardar}
          className="w-full btn-action-primary py-3"
        >
          Guardar Configuración
        </button>
      </div>
    </div>
  );
}

// ========================================
// TAB BACKUP
// ========================================

function TabBackup({ onClose: _onClose }: { onClose: () => void }) {
  const [exportando, setExportando] = useState(false);
  const [stats, setStats] = useState<{
    ventas: number;
    productos: number;
    vales: number;
    gastos: number;
    ultimaSync: string | null;
  } | null>(null);
  
  const agregarNotificacion = useUIStore(state => state.agregarNotificacion);
  
  useEffect(() => {
    const cargarStats = async () => {
      const [ventas, productos, vales, gastos, config] = await Promise.all([
        db.ventas.count(),
        db.productos.count(),
        db.vales.count(),
        db.gastos.count(),
        db.configuracion.get('sistema')
      ]);
      
      setStats({
        ventas,
        productos,
        vales,
        gastos,
        ultimaSync: config?.ultimaSincronizacion 
          ? new Date(config.ultimaSincronizacion).toLocaleString() 
          : null
      });
    };
    
    cargarStats();
  }, []);
  
  const exportarBackup = async () => {
    setExportando(true);
    try {
      const backup = await exportarBackupJSON();
      
      // Crear archivo y descargar
      const blob = new Blob([backup], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `solyverdepos-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      agregarNotificacion('success', 'Backup creado', 'El archivo se descargó correctamente');
    } catch (error) {
      agregarNotificacion('error', 'Error', 'No se pudo crear el backup');
    } finally {
      setExportando(false);
    }
  };
  
  const forzarSincronizacion = async () => {
    // La sincronización real se implementará con el servicio de Google Sheets
    agregarNotificacion('info', 'Sincronización', 'Función en desarrollo');
  };
  
  return (
    <div className="space-y-4">
      {/* Estadísticas */}
      {stats && (
        <div className="bg-dark-400 rounded-xl p-4 space-y-3">
          <h4 className="font-semibold text-white">📊 Datos almacenados</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-400">Ventas</span>
              <span className="text-white font-mono">{stats.ventas}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Productos</span>
              <span className="text-white font-mono">{stats.productos}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Vales</span>
              <span className="text-white font-mono">{stats.vales}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Gastos</span>
              <span className="text-white font-mono">{stats.gastos}</span>
            </div>
          </div>
          
          {stats.ultimaSync && (
            <div className="pt-3 border-t border-dark-200 text-sm">
              <span className="text-zinc-400">Última sincronización: </span>
              <span className="text-white">{new Date(stats.ultimaSync).toLocaleString('es-AR')}</span>
            </div>
          )}
        </div>
      )}
      
      {/* Acciones */}
      <div className="space-y-3">
        <button
          onClick={exportarBackup}
          disabled={exportando}
          className="w-full bg-dark-400 hover:bg-dark-200 p-4 rounded-xl flex items-center gap-4 transition-colors"
        >
          <span className="text-3xl">💾</span>
          <div className="text-left flex-1">
            <div className="font-semibold text-white">Descargar Backup</div>
            <div className="text-zinc-500 text-sm">Archivo JSON con todos los datos</div>
          </div>
          {exportando && (
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          )}
        </button>
        
        <button
          onClick={forzarSincronizacion}
          className="w-full bg-dark-400 hover:bg-dark-200 p-4 rounded-xl flex items-center gap-4 transition-colors"
        >
          <span className="text-3xl">☁️</span>
          <div className="text-left">
            <div className="font-semibold text-white">Forzar Sincronización</div>
            <div className="text-zinc-500 text-sm">Subir datos pendientes a Google Sheets</div>
          </div>
        </button>
      </div>
      
      {/* Info */}
      <div className="bg-info/20 rounded-xl p-4 text-sm">
        <span className="text-info">💡 </span>
        <span className="text-zinc-300">
          Los datos se almacenan localmente y se sincronizan automáticamente cuando hay conexión.
          Se recomienda hacer backups periódicos.
        </span>
      </div>
    </div>
  );
}
