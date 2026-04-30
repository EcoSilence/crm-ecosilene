import React, { useState, useMemo } from 'react';
import { useAppStore } from '../context/AppDataContext';
import { ChevronDown, ChevronRight, Search, Plus, Calendar, X, MapPin, CalendarDays, CheckCircle, Edit2, Trash2 } from 'lucide-react';

const STAGES = ['Cotizado', 'Aprobado', 'Por Cobrar', 'Pagado'];

const KanbanBoard = () => {
  const { servicios, updateServiceStage, removeServicio, editServicio, clientes, cotizaciones, inventario, navigate, formatDateDDMMYYYY, selectedKanbanMonth } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedStage, setExpandedStage] = useState('Cotizado');

  // Modal State para Editar Servicio
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);

  const monthNames = {
    '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril',
    '05': 'Mayo', '06': 'Junio', '07': 'Julio', '08': 'Agosto',
    '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre'
  };

  const getClientName = (id) => {
    const c = clientes.find(c => c.id === id);
    return c ? (c.empresa ? `${c.empresa} - ${c.nombre} ${c.apellido}` : `${c.nombre} ${c.apellido}`) : 'Desconocido';
  };

  const formatCurrency = (val, currency = 'CLP') => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency }).format(val || 0);
  };

  const getServiceTotals = (idServicio, descuentoData = 0) => {
    const items = (cotizaciones || []).filter(c => c.servicioId === idServicio);
    const subtotalBruto = items.reduce((acc, c) => acc + c.subtotal, 0);
    const descuentoMonto = subtotalBruto * (descuentoData / 100);
    const neto = subtotalBruto - descuentoMonto;
    const total = neto * 1.19;
    return { neto, total };
  };

  const filteredServicios = useMemo(() => {
    let result = (servicios || []);

    if (selectedKanbanMonth === 'sinFecha') {
      result = result.filter(s => !s.fechaInicio);
    } else if (selectedKanbanMonth) {
      const [y, m] = selectedKanbanMonth.split('-');
      result = result.filter(s => {
        if (!s.fechaInicio) return false;
        const d = new Date(s.fechaInicio);
        return d.getFullYear().toString() === y && (d.getMonth() + 1).toString().padStart(2, '0') === m;
      });
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(s => {
        const clientName = getClientName(s.clienteId).toLowerCase();
        const idLower = String(s.idServicio).toLowerCase();
        return clientName.includes(term) || idLower.includes(term) || (s.direccionEvento || '').toLowerCase().includes(term);
      });
    }

    // Ordenar de más reciente a más antiguo por defecto
    result.sort((a, b) => {
      if (!a.fechaInicio) return 1;
      if (!b.fechaInicio) return -1;
      return a.fechaInicio > b.fechaInicio ? -1 : 1;
    });

    return result;
  }, [servicios, searchTerm, clientes, selectedKanbanMonth]);

  const toggleStage = (st) => {
    setExpandedStage(expandedStage === st ? null : st);
  };

  const getStageColor = (st) => {
    switch(st) {
      case 'Cotizado': return 'var(--color-banana)';
      case 'Aprobado': return 'var(--color-berry)';
      case 'Por Cobrar': return 'var(--color-tomato)';
      case 'Pagado': return 'var(--color-basil)';
      default: return 'var(--text-main)';
    }
  };

  const openEditModal = (servicio) => {
    setEditingService({ ...servicio });
    setIsEditModalOpen(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditingService(prev => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    editServicio(editingService.idServicio, editingService);
    setIsEditModalOpen(false);
    setEditingService(null);
  };

  let titleMonthStr = "";
  if (selectedKanbanMonth === 'sinFecha') titleMonthStr = " - Sin Fecha";
  else if (selectedKanbanMonth) {
    const [y, m] = selectedKanbanMonth.split('-');
    titleMonthStr = ` - ${monthNames[m]} ${y}`;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%', paddingBottom: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: '0 0 0.5rem 0' }}>Flujo de Trabajo<span style={{ color: 'var(--accent-primary)' }}>{titleMonthStr}</span></h1>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>Utiliza el menú lateral izquierdo para seleccionar el mes y año que deseas visualizar.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div className="search-bar" style={{ width: '250px' }}>
            <Search size={18} />
            <input 
              type="text" 
              placeholder="Buscar por ID, Cliente o Lugar..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={() => navigate('nuevo-servicio')}>
            <Plus size={18} /> Nuevo Servicio
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
        {STAGES.map(stage => {
          const stageServices = filteredServicios.filter(s => s.etapa === stage);
          const stageTotal = stageServices.reduce((acc, s) => {
              const totals = getServiceTotals(s.idServicio, s.descuento || 0);
              return acc + totals.total;
          }, 0);

          return (
            <div key={stage} style={{ 
              background: 'var(--bg-dark)', 
              border: '1px solid var(--border-color)', 
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden'
            }}>
              {/* Stage Header */}
              <div 
                style={{ 
                  padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer',
                  borderLeft: `4px solid ${getStageColor(stage)}`,
                  background: expandedStage === stage ? 'rgba(255,255,255,0.02)' : 'transparent'
                }}
                onClick={() => toggleStage(stage)}
              >
                <strong style={{ color: getStageColor(stage), fontSize: '1.1rem' }}>{stage}</strong>
                <span className="badge" style={{ background: 'rgba(255,255,255,0.1)' }}>{stageServices.length}</span>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Total Acumulado: {formatCurrency(stageTotal)}</span>
                <div style={{ marginLeft: 'auto' }}>
                  {expandedStage === stage ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </div>
              </div>

              {/* Stage Content */}
              {expandedStage === stage && (
                <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  {stageServices.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic', margin: '1rem 0', textAlign: 'center' }}>No hay servicios en esta etapa para el periodo seleccionado.</p>
                  ) : (
                    stageServices.map(s => {
                      const { neto, total } = getServiceTotals(s.idServicio, s.descuento || 0);
                      const currency = s.moneda || 'CLP';
                      const sQuotations = cotizaciones.filter(c => c.servicioId === s.idServicio);
                      let audifonos = 0; let transmisores = 0;
                      sQuotations.forEach(q => {
                        const eq = inventario?.find(i => i.idEquipo === q.equipoId);
                        if (eq) {
                          if (eq.categoria === 'Audio' || eq.nombreEquipo.toLowerCase().includes('audífono') || eq.nombreEquipo.toLowerCase().includes('audifono')) audifonos += q.cantidad;
                          else if (eq.categoria === 'Transmisión' || eq.nombreEquipo.toLowerCase().includes('transmisor') || eq.nombreEquipo.toUpperCase().includes('TX')) transmisores += q.cantidad;
                        }
                      });

                      return (
                        <div key={s.idServicio} style={{ 
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                          padding: '0.8rem 1.2rem', background: 'var(--bg-dark)', borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-color)', gap: '1.5rem', flexWrap: 'wrap'
                        }}>
                          {/* 1. Izquierda: ID, Cliente, Fecha, Dirección */}
                          <div style={{ flex: '1 1 250px', minWidth: '200px' }}>
                            <h5 style={{ margin: '0 0 0.4rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', flexWrap: 'wrap' }}>
                              {s.idServicio} <span className="text-muted" style={{ fontWeight: 400, fontSize: '0.85rem' }}>— {getClientName(s.clienteId)}</span>
                            </h5>
                            <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem', flexWrap: 'wrap' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><MapPin size={13}/> {s.direccionEvento || 'Sin dirección'}</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><CalendarDays size={13}/> Inicio: {s.fechaInicio ? formatDateDDMMYYYY(s.fechaInicio) : 'Por definir'}</span>
                            </div>
                          </div>

                          {/* 2. Centro: Equipos y Valores */}
                          <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem' }}>
                            {(audifonos > 0 || transmisores > 0) && (
                              <div style={{ display: 'flex', gap: '0.8rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {audifonos > 0 && <span style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>🎧 Audífonos: <strong>{audifonos}</strong></span>}
                                {transmisores > 0 && <span style={{ background: 'rgba(234, 179, 8, 0.1)', color: '#facc15', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>📡 Transmisores (TX): <strong>{transmisores}</strong></span>}
                              </div>
                            )}
                            <div style={{ display: 'flex', gap: '0.8rem', fontSize: '0.85rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                              <span style={{ background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>Neto: <strong style={{ color: 'var(--text-main)' }}>{formatCurrency(neto, currency)}</strong></span>
                              <span style={{ background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>Total c/IVA: <strong style={{ color: 'var(--accent-primary)' }}>{formatCurrency(total, currency)}</strong></span>
                            </div>
                          </div>

                          {/* 3. Derecha: Controles */}
                          <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <select className="input-control" style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', width: '130px', margin: 0 }} value={s.etapa} onChange={(e) => updateServiceStage(s.idServicio, e.target.value)}>
                              {STAGES.map(st => <option key={st} value={st}>{st}</option>)}
                            </select>
                            <button className="btn btn-ghost" style={{ padding: '0.4rem', color: 'var(--text-muted)' }} onClick={() => openEditModal(s)}><Edit2 size={16}/></button>
                            <button className="btn btn-ghost" style={{ padding: '0.4rem', color: 'var(--color-tomato)' }} onClick={() => { if(window.confirm('¿Deseas eliminar definitivamente esta tarea y todas sus cotizaciones asociadas?')) removeServicio(s.idServicio) }}><Trash2 size={16}/></button>
                            <button className="btn btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }} onClick={() => navigate('cotizaciones', { servicioId: s.idServicio })}><CheckCircle size={16}/> Cotizar</button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal para Editar Servicio */}
      {isEditModalOpen && editingService && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}>Editar Servicio</h2>
              <button className="btn btn-ghost" onClick={() => setIsEditModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label>Dirección del Evento</label>
                <input type="text" className="input-control" name="direccionEvento" value={editingService.direccionEvento || ''} onChange={handleEditChange} required />
              </div>
              <div className="form-group">
                <label>Fecha y Hora de Inicio</label>
                <input type="datetime-local" className="input-control" name="fechaInicio" value={editingService.fechaInicio ? editingService.fechaInicio.substring(0,16) : ''} onChange={handleEditChange} required />
              </div>
              <div className="form-group">
                <label>Fecha y Hora de Fin</label>
                <input type="datetime-local" className="input-control" name="fechaFin" value={editingService.fechaFin ? editingService.fechaFin.substring(0,16) : ''} onChange={handleEditChange} required />
              </div>
              <div className="form-group">
                <label>Etapa</label>
                <select className="input-control" name="etapa" value={editingService.etapa} onChange={handleEditChange}>
                  {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setIsEditModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default KanbanBoard;
