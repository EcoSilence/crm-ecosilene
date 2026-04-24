import React, { useState } from 'react';
import { useAppStore } from '../context/AppDataContext';
import { Plus, Search, Box, Package as PkgIcon, AlertTriangle, X, CalendarDays } from 'lucide-react';

const InventarioView = () => {
  const { inventario, getStockActual, addEquipo, editEquipo, removeEquipo } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [stockDate, setStockDate] = useState(new Date().toISOString().split('T')[0]);

  // Modal State para Agregar/Editar Equipo
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    idEquipo: '', nombreEquipo: '', categoria: 'Audio', stockTotal: 0, ubicacionBodega: ''
  });

  const filteredInv = inventario.filter(e => 
    e.nombreEquipo.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.categoria.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openNewModal = () => {
    setEditMode(false);
    setFormData({ idEquipo: '', nombreEquipo: '', categoria: 'Audio', stockTotal: 0, ubicacionBodega: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (equipo) => {
    setEditMode(true);
    setFormData({ ...equipo });
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editMode) {
      editEquipo(formData.idEquipo, formData);
    } else {
      addEquipo(formData);
    }
    setIsModalOpen(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="responsive-flex-column" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.5rem' }}>Control de Inventario</h1>
          <p style={{ color: 'var(--text-muted)' }}>Supervisa el stock total y disponible considerando los servicios en curso (virtual).</p>
        </div>
        <button className="btn btn-primary" style={{ width: '100%', maxWidth: '200px' }} onClick={openNewModal}><Plus size={18} /> Nuevo Equipo</button>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="input-group" style={{ margin: 0, width: '100%', maxWidth: '300px', position: 'relative' }}>
             <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
             <input 
               type="text" 
               className="input-control" 
               placeholder="Buscar equipo o categoría..." 
               style={{ paddingLeft: '2.2rem' }}
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
             />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', background: 'var(--bg-dark)', padding: '0.4rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
             <CalendarDays size={18} color="var(--text-muted)" />
             <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Proyectar stock:</span>
             <input 
               type="date"
               className="input-control"
               style={{ border: 'none', background: 'transparent', padding: '0 0.5rem', width: 'auto' }}
               value={stockDate}
               onChange={(e) => setStockDate(e.target.value)}
             />
          </div>
        </div>

        <div style={{ overflowX: 'auto', maxHeight: '70vh', position: 'relative' }}>
          <table className="sticky-header" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '1rem' }}>Equipo</th>
                <th style={{ padding: '1rem' }}>Categoría</th>
                <th style={{ padding: '1rem' }}>Ubicación</th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>Stock Total</th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>Stock Actual (Virtual)</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredInv.map((e) => {
                const stockActual = getStockActual(e.idEquipo, stockDate, stockDate);
                const isLowStock = stockActual < 5;
                const isOut = stockActual <= 0;

                return (
                  <tr key={e.idEquipo} style={{ borderBottom: '1px solid var(--border-color)', transition: 'var(--transition)' }}>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', fontWeight: 600 }}>
                        <div style={{ padding: '0.4rem', background: 'var(--bg-panel)', borderRadius: '6px' }}>
                           <PkgIcon size={18} color="var(--accent-primary)" />
                        </div>
                        {e.nombreEquipo}
                      </div>
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{e.categoria}</td>
                    <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Box size={14} />
                        {e.ubicacionBodega}
                      </div>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 500 }}>{e.stockTotal}</td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                        <span style={{ 
                          padding: '0.2rem 0.8rem', 
                          borderRadius: '12px', 
                          background: isOut ? 'var(--color-tomato-bg)' : isLowStock ? 'var(--color-banana-bg)' : 'var(--color-basil-bg)',
                          color: isOut ? 'var(--color-tomato)' : isLowStock ? 'var(--color-banana)' : 'var(--color-basil)',
                          fontWeight: 600
                        }}>
                          {stockActual}
                        </span>
                        {(isLowStock || isOut) && <AlertTriangle size={16} color={isOut ? 'var(--color-tomato)' : 'var(--color-banana)'} />}
                      </div>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                         <button className="btn btn-ghost" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => openEditModal(e)}>Ajustar / Editar</button>
                         <button className="btn btn-ghost" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', color: 'var(--color-tomato)' }} onClick={() => { if(window.confirm(`¿Seguro que deseas eliminar el equipo "${e.nombreEquipo}"?`)) removeEquipo(e.idEquipo) }}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredInv.length === 0 && (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No se encontraron equipos.</div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 9999 }}>
           <div className="modal-content" style={{ margin: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                 <h2 style={{ margin: 0, fontSize: '1.3rem' }}>{editMode ? 'Ajustar Inventario' : 'Registrar Nuevo Equipo'}</h2>
                 <button className="btn btn-ghost" style={{ padding: '0.4rem', border: 'none' }} onClick={() => setIsModalOpen(false)}>
                    <X size={20} />
                 </button>
              </div>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                 
                 <div className="input-group" style={{ margin: 0 }}>
                   <label className="input-label">Nombre del Equipo</label>
                   <input required type="text" className="input-control" value={formData.nombreEquipo} onChange={e => setFormData({...formData, nombreEquipo: e.target.value})} />
                 </div>

                 <div className="responsive-flex-column" style={{ display: 'flex', gap: '1rem' }}>
                   <div className="input-group" style={{ flex: 2, margin: 0 }}>
                     <label className="input-label">Categoría</label>
                     <select className="input-control" value={formData.categoria} onChange={e => setFormData({...formData, categoria: e.target.value})}>
                       {['Audio', 'Transmisión', 'Iluminación', 'Video', 'Accesorios', 'Estructura'].map(cat => (
                         <option key={cat} value={cat}>{cat}</option>
                       ))}
                     </select>
                   </div>
                   <div className="input-group" style={{ flex: 1, margin: 0 }}>
                     <label className="input-label">Cantidad Base (Stock Físico Real)</label>
                     <input required type="number" min="0" className="input-control" value={formData.stockTotal} onChange={e => setFormData({...formData, stockTotal: e.target.value})} />
                   </div>
                 </div>

                 <div className="input-group" style={{ margin: 0 }}>
                   <label className="input-label">Ubicación Fija en Bodega</label>
                   <input required type="text" className="input-control" placeholder="Ej: Pasillo C, Estante 4" value={formData.ubicacionBodega} onChange={e => setFormData({...formData, ubicacionBodega: e.target.value})} />
                 </div>
                 
                 <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setIsModalOpen(false)}>Cancelar</button>
                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{editMode ? 'Guardar Cambios' : 'Guardar Equipo'}</button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default InventarioView;
