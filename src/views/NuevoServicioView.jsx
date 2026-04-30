import React, { useState } from 'react';
import { useAppStore } from '../context/AppDataContext';
import { ArrowLeft, UserPlus, MapPin, Calendar, Clock, Save, Search, Users } from 'lucide-react';

const NuevoServicioView = () => {
  const { clientes, addServicio, navigate } = useAppStore();
  
  const [formData, setFormData] = useState({
    clienteId: '',
    direccionEvento: '',
    fechaInicio: '',
    fechaFin: '',
  });

  const [searchTerm, setSearchTerm] = useState('');

  const filteredClientes = clientes.filter(c => {
    const full = `${c.nombre} ${c.apellido} ${c.empresa || ''}`.toLowerCase();
    return full.includes(searchTerm.toLowerCase());
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.clienteId) {
      alert('Por favor selecciona un cliente');
      return;
    }
    addServicio(formData);
    navigate('kanban'); // Volver al flujo de trabajo
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '3rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button className="btn btn-ghost" onClick={() => navigate('kanban')}>
          <ArrowLeft size={18} /> Volver
        </button>
        <h1 style={{ margin: 0 }}>Crear Nuevo Servicio</h1>
      </div>

      <div className="glass-card" style={{ padding: '2rem' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Selección de Cliente */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.2rem' }}>
              <div style={{ background: 'var(--accent-gradient)', padding: '0.5rem', borderRadius: '8px', color: '#fff' }}>
                <Users size={20} />
              </div>
              <h3 style={{ margin: 0 }}>Seleccionar Cliente</h3>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="search-bar" style={{ width: '100%', maxWidth: 'none' }}>
                <Search size={18} />
                <input 
                  type="text" 
                  placeholder="Buscar cliente por nombre o empresa..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div style={{ 
                maxHeight: '200px', 
                overflowY: 'auto', 
                border: '1px solid var(--border-color)', 
                borderRadius: 'var(--radius-md)',
                background: 'rgba(0,0,0,0.2)'
              }}>
                {filteredClientes.length === 0 ? (
                  <p style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>No se encontraron clientes.</p>
                ) : (
                  filteredClientes.map(c => (
                    <div 
                      key={c.id} 
                      onClick={() => setFormData(prev => ({ ...prev, clienteId: c.id }))}
                      style={{ 
                        padding: '0.8rem 1.2rem', 
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--border-color)',
                        background: formData.clienteId === c.id ? 'var(--bg-panel-hover)' : 'transparent',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'var(--transition)'
                      }}
                    >
                      <div>
                        <strong style={{ color: formData.clienteId === c.id ? 'var(--accent-primary)' : 'var(--text-main)' }}>
                          {c.empresa ? `${c.empresa} — ` : ''}{c.nombre} {c.apellido}
                        </strong>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>{c.correo || 'Sin correo'}</p>
                      </div>
                      {formData.clienteId === c.id && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent-primary)' }}></div>}
                    </div>
                  ))
                )}
              </div>
              <button type="button" className="btn btn-ghost" style={{ alignSelf: 'flex-start', fontSize: '0.85rem' }} onClick={() => navigate('clientes')}>
                <UserPlus size={16} /> ¿Cliente nuevo? Créalo aquí
              </button>
            </div>
          </section>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: 0 }} />

          {/* Detalles del Evento */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.2rem' }}>
              <div style={{ background: 'var(--accent-gradient)', padding: '0.5rem', borderRadius: '8px', color: '#fff' }}>
                <MapPin size={20} />
              </div>
              <h3 style={{ margin: 0 }}>Detalles del Evento</h3>
            </div>
            
            <div className="responsive-grid-2" style={{ gap: '1.5rem' }}>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Dirección del Evento / Lugar</label>
                <div style={{ position: 'relative' }}>
                  <MapPin size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    name="direccionEvento"
                    className="input-control" 
                    style={{ paddingLeft: '2.5rem' }}
                    placeholder="Ej: Hotel Marriott, Salón Ballroom" 
                    value={formData.direccionEvento}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Fecha y Hora de Inicio</label>
                <div style={{ position: 'relative' }}>
                  <Calendar size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input 
                    type="datetime-local" 
                    name="fechaInicio"
                    className="input-control" 
                    style={{ paddingLeft: '2.5rem' }}
                    value={formData.fechaInicio}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Fecha y Hora de Término</label>
                <div style={{ position: 'relative' }}>
                  <Clock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input 
                    type="datetime-local" 
                    name="fechaFin"
                    className="input-control" 
                    style={{ paddingLeft: '2.5rem' }}
                    value={formData.fechaFin}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            </div>
          </section>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
            <button type="button" className="btn btn-ghost" onClick={() => navigate('kanban')}>Cancelar</button>
            <button type="submit" className="btn btn-primary" style={{ padding: '0.8rem 2rem' }}>
              <Save size={18} /> Guardar Servicio y Continuar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NuevoServicioView;
