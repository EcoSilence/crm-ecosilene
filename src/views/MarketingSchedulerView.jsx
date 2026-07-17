import React, { useState } from 'react';
import { useMarketingScheduler } from '../context/MarketingSchedulerContext';
import { Calendar, Plus, X, Edit2, Trash2, CheckCircle, Clock, FileText, Share2, Mail } from 'lucide-react';

const InstagramIcon = ({ size = 16, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const MarketingSchedulerView = () => {
  const { campanas, addCampana, updateCampana, removeCampana } = useMarketingScheduler();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCampana, setEditingCampana] = useState(null);

  const [formData, setFormData] = useState({
    fechaPublicacion: new Date().toISOString().split('T')[0],
    tipoContenido: 'Carrusel',
    canal: 'Instagram',
    contenidoCopy: '',
    estado: 'Borrador'
  });

  const resetForm = () => {
    setFormData({
      fechaPublicacion: new Date().toISOString().split('T')[0],
      tipoContenido: 'Carrusel',
      canal: 'Instagram',
      contenidoCopy: '',
      estado: 'Borrador'
    });
    setEditingCampana(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingCampana) {
      updateCampana(editingCampana.idCampana, formData);
    } else {
      addCampana(formData);
    }
    setIsModalOpen(false);
    resetForm();
  };

  const handleEdit = (campana) => {
    setEditingCampana(campana);
    setFormData({ ...campana });
    setIsModalOpen(true);
  };

  const getStatusBadgeClass = (estado) => {
    switch (estado) {
      case 'Publicado': return 'badge badge-pagado';
      case 'Programado': return 'badge badge-aprobado';
      default: return 'badge badge-cotizado';
    }
  };

  const getCanalIcon = (canal) => {
    return canal === 'Correo' 
      ? <Mail size={16} style={{ color: 'var(--accent-secondary)' }} /> 
      : <InstagramIcon size={16} style={{ color: 'var(--accent-primary)' }} />;
  };

  // Agrupar campañas por fecha para el minicalendario
  const campanasByDate = campanas.reduce((acc, c) => {
    acc[c.fechaPublicacion] = acc[c.fechaPublicacion] || [];
    acc[c.fechaPublicacion].push(c);
    return acc;
  }, {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '3rem' }}>
      
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <Calendar size={30} color="var(--accent-primary)" /> Planificador de Contenidos
          </h1>
          <p style={{ margin: '0.3rem 0 0 0', color: 'var(--text-muted)' }}>
            Planifica tus campañas de email marketing y redes sociales de EcoSilence.
          </p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          style={{ width: '100%', maxWidth: '220px', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}
        >
          <Plus size={18} /> Nueva Publicación
        </button>
      </div>

      <div className="responsive-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        
        {/* Panel Izquierdo: Lista de Publicaciones */}
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.8rem' }}>
            Campañas Planificadas ({campanas.length})
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '60vh', overflowY: 'auto' }}>
            {campanas.map(c => (
              <div 
                key={c.idCampana} 
                className="glass-panel" 
                style={{ 
                  padding: '1.2rem', 
                  borderRadius: '10px', 
                  borderLeft: `4px solid ${c.canal === 'Correo' ? 'var(--accent-secondary)' : 'var(--accent-primary)'}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.8rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {getCanalIcon(c.canal)} {c.canal} — {c.tipoContenido}
                  </span>
                  <span className={getStatusBadgeClass(c.estado)}>{c.estado}</span>
                </div>
                
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-main)', whiteSpace: 'pre-wrap', maxHeight: '80px', overflowY: 'hidden', textOverflow: 'ellipsis' }}>
                  {c.contenidoCopy}
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '0.6rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <span>Publicación: <strong>{c.fechaPublicacion}</strong></span>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button className="btn btn-ghost" style={{ padding: '0.2rem 0.5rem' }} onClick={() => handleEdit(c)}>
                      <Edit2 size={13} />
                    </button>
                    <button className="btn btn-ghost" style={{ padding: '0.2rem 0.5rem', color: 'var(--color-tomato)' }} onClick={() => { if(window.confirm('¿Eliminar esta publicación?')) removeCampana(c.idCampana) }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {campanas.length === 0 && (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', margin: '2rem 0' }}>No hay campañas planificadas.</p>
            )}
          </div>
        </div>

        {/* Panel Derecho: Vista Calendario Móvil/Mini */}
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.8rem' }}>
            Calendario Editorial
          </h3>
          
          {/* Un minicalendario responsive de 31 días sencillos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', textAlign: 'center' }}>
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
              <strong key={d} style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{d}</strong>
            ))}
            
            {/* Rellenamos un mes de ejemplo (Mayo 2026) */}
            {Array.from({ length: 4 }).map((_, i) => <div key={`empty-${i}`} />)}
            {Array.from({ length: 31 }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `2026-05-${String(dayNum).padStart(2, '0')}`;
              const dayCampanas = campanasByDate[dateStr] || [];
              const hasMail = dayCampanas.some(c => c.canal === 'Correo');
              const hasInstagram = dayCampanas.some(c => c.canal === 'Instagram');

              return (
                <div 
                  key={dayNum} 
                  style={{ 
                    padding: '0.5rem 0', 
                    borderRadius: '8px', 
                    background: dayCampanas.length > 0 ? 'rgba(255,255,255,0.03)' : 'transparent',
                    border: '1px solid',
                    borderColor: dayCampanas.length > 0 ? 'rgba(255,255,255,0.1)' : 'transparent',
                    position: 'relative',
                    cursor: 'default',
                    minHeight: '45px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <span style={{ fontSize: '0.85rem', fontWeight: dayCampanas.length > 0 ? 700 : 400 }}>{dayNum}</span>
                  <div style={{ display: 'flex', gap: '3px', marginTop: '3px' }}>
                    {hasInstagram && <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--accent-primary)' }} />}
                    {hasMail && <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--accent-secondary)' }} />}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', justifyContent: 'center', marginTop: '0.5rem', color: 'var(--text-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-primary)' }} /> Instagram
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-secondary)' }} /> Correo (Newsletter)
            </span>
          </div>
        </div>

      </div>

      {/* Modal Agregar / Editar */}
      {isModalOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
          <div className="glass-card animate-scale-in" style={{ width: '90%', maxWidth: '500px', padding: '2rem', margin: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>
                {editingCampana ? 'Editar Publicación' : 'Planificar Nueva Campaña'}
              </h2>
              <button className="btn btn-ghost" style={{ padding: '0.4rem', border: 'none' }} onClick={() => { setIsModalOpen(false); resetForm(); }}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div className="responsive-flex-column" style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label className="input-label" style={{ marginBottom: '0.3rem', display: 'block' }}>Canal</label>
                  <select 
                    className="input-control" 
                    value={formData.canal} 
                    onChange={e => setFormData({...formData, canal: e.target.value})}
                  >
                    <option value="Instagram">Instagram</option>
                    <option value="Correo">Correo Electrónico</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label className="input-label" style={{ marginBottom: '0.3rem', display: 'block' }}>Tipo Contenido</label>
                  <select 
                    className="input-control" 
                    value={formData.tipoContenido} 
                    onChange={e => setFormData({...formData, tipoContenido: e.target.value})}
                  >
                    <option value="Carrusel">Carrusel</option>
                    <option value="Foto Informativa">Foto Informativa</option>
                    <option value="Mail">Mail</option>
                  </select>
                </div>
              </div>

              <div className="responsive-flex-column" style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label className="input-label" style={{ marginBottom: '0.3rem', display: 'block' }}>Fecha de Publicación</label>
                  <input 
                    type="date" 
                    className="input-control" 
                    required 
                    value={formData.fechaPublicacion} 
                    onChange={e => setFormData({...formData, fechaPublicacion: e.target.value})} 
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="input-label" style={{ marginBottom: '0.3rem', display: 'block' }}>Estado</label>
                  <select 
                    className="input-control" 
                    value={formData.estado} 
                    onChange={e => setFormData({...formData, estado: e.target.value})}
                  >
                    <option value="Borrador">Borrador</option>
                    <option value="Programado">Programado</option>
                    <option value="Publicado">Publicado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="input-label" style={{ marginBottom: '0.3rem', display: 'block' }}>Cuerpo del Copy / Mensaje</label>
                <textarea 
                  className="input-control" 
                  rows={4} 
                  required
                  placeholder="Escribe el copy de tu publicación aquí..." 
                  style={{ resize: 'vertical', width: '100%', fontFamily: 'inherit', padding: '0.8rem' }}
                  value={formData.contenidoCopy} 
                  onChange={e => setFormData({...formData, contenidoCopy: e.target.value})}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => { setIsModalOpen(false); resetForm(); }}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  {editingCampana ? 'Guardar Cambios' : 'Planificar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default MarketingSchedulerView;
