import React, { useMemo } from 'react';
import { useAppStore } from '../context/AppDataContext';
import { ArrowLeft, MapPin, CalendarDays, CheckCircle, Edit2, Trash2, Archive, DollarSign } from 'lucide-react';

const STAGES = ['Cotizado', 'Aprobado', 'Por Cobrar', 'Pagado'];

const ServiciosListView = ({ type = 'normal' }) => {
  const { servicios, clientes, cotizaciones, inventario, updateServiceStage, removeServicio, editServicio, navigate, viewParams, formatDateDDMMYYYY, isArchived, togglePagoAdelanto } = useAppStore();
  const stage = viewParams?.stage || 'Cotizado';

  // Modal States
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [editingService, setEditingService] = React.useState(null);

  // Sort services by date descending (newest first)
  const filteredServicios = useMemo(() => {
    let base = (servicios || []);
    
    if (type === 'archivados') {
      base = base.filter(isArchived);
    } else {
      base = base.filter(s => s.etapa === stage && !isArchived(s));
    }

    return base.sort((a, b) => {
      if (!a.fechaInicio) return 1;
      if (!b.fechaInicio) return -1;
      return a.fechaInicio > b.fechaInicio ? -1 : 1;
    });
  }, [servicios, stage, type, isArchived]);

  const openEditModal = (s) => {
    const [f1, h1] = (s.fechaInicio || '').split('T');
    const [f2, h2] = (s.fechaFin || '').split('T');
    setEditingService({ 
      ...s, 
      tempFecha: f1 || '', 
      tempHora: h1 ? h1.substring(0,5) : '',
      tempFechaFin: f2 || '',
      tempHoraFin: h2 ? h2.substring(0,5) : ''
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    let fechaInicio = '';
    if (editingService.tempFecha) {
      fechaInicio = editingService.tempHora ? `${editingService.tempFecha}T${editingService.tempHora}` : `${editingService.tempFecha}T00:00`;
    }
    let fechaFin = '';
    if (editingService.tempFechaFin) {
      fechaFin = editingService.tempHoraFin ? `${editingService.tempFechaFin}T${editingService.tempHoraFin}` : `${editingService.tempFechaFin}T23:59`;
    }
    const updated = { ...editingService, fechaInicio, fechaFin };
    delete updated.tempFecha; delete updated.tempHora; delete updated.tempFechaFin; delete updated.tempHoraFin;
    editServicio(editingService.idServicio, updated);
    setIsEditModalOpen(false);
    setEditingService(null);
  };

  const getClientName = (id) => {
    const c = clientes?.find(x => x.id === id);
    return c ? (c.empresa ? `${c.empresa} - ${c.nombre} ${c.apellido}` : `${c.nombre} ${c.apellido}`) : 'Desconocido';
  };

  const getServiceTotals = (idServicio, descuentoData = 0) => {
    const items = (cotizaciones || []).filter(c => c.servicioId === idServicio);
    const subtotalBruto = items.reduce((acc, c) => acc + (c.subtotal || 0), 0);
    const descuentoMonto = subtotalBruto * (descuentoData / 100);
    const neto = subtotalBruto - descuentoMonto;
    const total = neto * 1.19;
    return { neto, total };
  };

  const formatCurrency = (val, currency = 'CLP') => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency }).format(val || 0);
  };

  const getStageColor = (st) => {
    switch (st) {
      case 'Cotizado': return 'var(--color-banana)';
      case 'Aprobado': return 'var(--color-berry)';
      case 'Por Cobrar': return 'var(--color-tomato)';
      case 'Pagado': return 'var(--color-basil)';
      default: return 'var(--text-main)';
    }
  };

  const isArchivedView = type === 'archivados';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button className="btn btn-ghost" onClick={() => navigate('dashboard')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ArrowLeft size={18} /> Volver al Dashboard
        </button>
      </div>

      <div>
        <h1 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {isArchivedView ? (
            <> <Archive size={28} color="var(--color-tomato)" /> Archivados sin Aprobar </>
          ) : (
            <> Trabajos en etapa: <span style={{ color: getStageColor(stage) }}>{stage}</span> </>
          )}
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>
          {isArchivedView 
            ? "Servicios en etapa 'Cotizado' cuya fecha de evento ya pasó." 
            : `Lista de todos los servicios activos en etapa ${stage}.`} 
          Hay {filteredServicios.length} resultados.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
        {filteredServicios.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }} className="glass-panel">
            {isArchivedView ? "No hay servicios archivados por el momento." : "No hay servicios activos en esta etapa."}
          </div>
        ) : (
          filteredServicios.map(s => {
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
                border: '1px solid var(--border-color)', 
                borderLeft: `4px solid ${isArchivedView ? 'var(--color-tomato)' : getStageColor(stage)}`, 
                gap: '1.5rem', flexWrap: 'wrap',
                opacity: isArchivedView ? 0.8 : 1
              }}>
                {/* 1. Izquierda: ID, Cliente, Fecha, Dirección */}
                <div style={{ flex: '1 1 250px', minWidth: '200px' }}>
                  <h5 style={{ margin: '0 0 0.4rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', flexWrap: 'wrap' }}>
                    {s.idServicio} <span className="text-muted" style={{ fontWeight: 400, fontSize: '0.85rem' }}>— {getClientName(s.clienteId)}</span>
                    {s.pagoAdelanto && <span style={{ background: 'var(--color-basil)', color: '#fff', fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '4px', marginLeft: '0.5rem' }}>RESERVA PAGADA</span>}
                  </h5>
                  <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem', flexWrap: 'wrap' }}>
                     <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><MapPin size={13}/> {s.direccionEvento || 'Sin dirección'}</span>
                     <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: isArchivedView ? 'var(--color-tomato)' : 'inherit' }}><CalendarDays size={13}/> Inicio: {s.fechaInicio ? formatDateDDMMYYYY(s.fechaInicio) : 'Por definir'}</span>
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
                  <button 
                    className="btn" 
                    onClick={() => togglePagoAdelanto(s.idServicio)}
                    style={{ 
                      padding: '0.4rem 0.6rem', 
                      fontSize: '0.75rem', 
                      background: s.pagoAdelanto ? 'var(--color-basil)' : 'transparent',
                      border: '1px solid var(--border-color)',
                      color: s.pagoAdelanto ? '#fff' : 'var(--text-muted)',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem'
                    }}
                    title="Marcar pago de reserva 50%"
                  >
                    <ArrowLeft size={14} style={{ display: 'none' }} /> {/* hidden hack to use DollarSign if needed but I'll use DollarSign */}
                    <DollarSign size={14} /> 50%
                  </button>
                  <button className="btn btn-ghost" style={{ padding: '0.4rem', color: 'var(--text-muted)' }} onClick={() => openEditModal(s)}><Edit2 size={16}/></button>
                  <button className="btn btn-ghost" style={{ padding: '0.4rem', color: 'var(--color-tomato)' }} onClick={() => { if(window.confirm('¿Deseas eliminar definitivamente esta tarea y todas sus cotizaciones asociadas?')) removeServicio(s.idServicio) }}><Trash2 size={16}/></button>
                  {!isArchivedView && (
                    <button className="btn btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }} onClick={() => navigate('cotizaciones', { servicioId: s.idServicio, from: 'lista_servicios', stage, type })}><CheckCircle size={16}/> Cotizar</button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal para Editar Servicio */}
      {isEditModalOpen && editingService && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}>Editar Servicio</h2>
              <button className="btn btn-ghost" onClick={() => { setIsEditModalOpen(false); setEditingService(null); }}>
                <Edit2 size={20} style={{ display: 'none' }} /> Cerrar
              </button>
            </div>
            <form onSubmit={handleEditSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label>Dirección del Evento</label>
                <input type="text" className="input-control" value={editingService.direccionEvento || ''} onChange={(e) => setEditingService({...editingService, direccionEvento: e.target.value})} />
              </div>
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Fecha Inicio</label>
                  <input type="date" className="input-control" value={editingService.tempFecha || ''} onChange={(e) => setEditingService({...editingService, tempFecha: e.target.value})} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Hora Inicio</label>
                  <input type="time" className="input-control" value={editingService.tempHora || ''} onChange={(e) => setEditingService({...editingService, tempHora: e.target.value})} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Fecha Fin</label>
                  <input type="date" className="input-control" value={editingService.tempFechaFin || ''} onChange={(e) => setEditingService({...editingService, tempFechaFin: e.target.value})} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Hora Fin</label>
                  <input type="time" className="input-control" value={editingService.tempHoraFin || ''} onChange={(e) => setEditingService({...editingService, tempHoraFin: e.target.value})} />
                </div>
              </div>

              <div className="form-group">
                <label>Etapa</label>
                <select className="input-control" value={editingService.etapa} onChange={(e) => setEditingService({...editingService, etapa: e.target.value})}>
                  {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setIsEditModalOpen(false)}>Cancelar</button>
                <button type="submit" formNoValidate className="btn btn-primary">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiciosListView;
