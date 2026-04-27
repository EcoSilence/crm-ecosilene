import React, { useState, useMemo } from 'react';
import { useAppStore } from '../context/AppDataContext';
import { Clock, MapPin, User, CalendarDays, ChevronDown, ChevronUp, ChevronRight, CheckCircle, Plus, X, Folder, FolderOpen, Edit2, Trash2 } from 'lucide-react';

const STAGES = ['Cotizado', 'Aprobado', 'Por Cobrar', 'Pagado'];

const KanbanBoard = () => {
  const { servicios, clientes, cotizaciones, inventario, updateServiceStage, addServicio, editServicio, removeServicio, navigate } = useAppStore();
  
  // States para la navegación de carpetas
  const [expandedYears, setExpandedYears] = useState({});
  const [expandedMonths, setExpandedMonths] = useState({});
  const [expandedStage, setExpandedStage] = useState(null);

  // Modal State para Agregar / Editar Servicio
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    clienteId: clientes.length > 0 ? clientes[0].id : '',
    direccionEvento: '',
    fechaInicioDate: '',
    fechaInicioTime: '',
    fechaFinDate: '',
    fechaFinTime: ''
  });

  const filteredSortedClientes = useMemo(() => {
    const search = searchTerm.toLowerCase();
    const filtered = clientes.filter(c => {
       const nombre = (c.nombre || '').toLowerCase();
       const apellido = (c.apellido || '').toLowerCase();
       const empresa = (c.empresa || '').toLowerCase();
       return nombre.includes(search) || apellido.includes(search) || empresa.includes(search);
    });

    return filtered.sort((a,b) => {
       const empA = (a.empresa || 'zz_sin_empresa').toLowerCase();
       const empB = (b.empresa || 'zz_sin_empresa').toLowerCase();
       if (empA < empB) return -1;
       if (empA > empB) return 1;
       return 0;
    });
  }, [clientes, searchTerm]);

  const openNewModal = () => {
    setEditMode(false);
    setEditingId(null);
    setSearchTerm('');
    setFormData({ clienteId: '', direccionEvento: '', fechaInicioDate: '', fechaInicioTime: '', fechaFinDate: '', fechaFinTime: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (servicio) => {
    setEditMode(true);
    setEditingId(servicio.idServicio);
    setSearchTerm('');
    const startParts = (servicio.fechaInicio || '').split('T');
    const endParts = (servicio.fechaFin || '').split('T');
    setFormData({
      clienteId: servicio.clienteId,
      direccionEvento: servicio.direccionEvento,
      fechaInicioDate: startParts[0] || '',
      fechaInicioTime: startParts[1] ? startParts[1].substring(0, 5) : '',
      fechaFinDate: endParts[0] || '',
      fechaFinTime: endParts[1] ? endParts[1].substring(0, 5) : ''
    });
    setIsModalOpen(true);
  };

  const getClientName = (id) => {
    const c = clientes.find(c => c.id === id);
    return c ? (c.empresa ? `${c.empresa} - ${c.nombre} ${c.apellido}` : `${c.nombre} ${c.apellido}`) : 'Desconocido';
  };

  const getStageColor = (stage) => {
    switch (stage) {
      case 'Cotizado': return 'var(--color-banana)';
      case 'Aprobado': return 'var(--color-berry)';
      case 'Por Cobrar': return 'var(--color-tomato)';
      case 'Pagado': return 'var(--color-basil)';
      default: return 'var(--text-muted)';
    }
  };

  const toggleStage = (stage) => {
    if (expandedStage === stage) setExpandedStage(null);
    else setExpandedStage(stage);
  };

  const toggleYear = (year) => {
    setExpandedYears(prev => ({ ...prev, [year]: !prev[year] }));
  };

  const toggleMonth = (monthKey) => {
    setExpandedMonths(prev => ({ ...prev, [monthKey]: !prev[monthKey] }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.clienteId) return alert('Debes seleccionar un cliente.');
    
    const buildDateTime = (date, time) => {
       if (!date) return '';
       return time ? `${date}T${time}` : date;
    };
    
    const finalData = {
       clienteId: formData.clienteId,
       direccionEvento: formData.direccionEvento,
       fechaInicio: buildDateTime(formData.fechaInicioDate, formData.fechaInicioTime),
       fechaFin: buildDateTime(formData.fechaFinDate, formData.fechaFinTime)
    };

    if (editMode && editingId) {
       editServicio(editingId, finalData);
    } else {
       addServicio(finalData);
    }
    
    setIsModalOpen(false);
  };

  const monthNames = {
    '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril', '05': 'Mayo', '06': 'Junio',
    '07': 'Julio', '08': 'Agosto', '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre'
  };

  // Estructurar la data en árbol jerárquico: Year -> Month
  const groupedData = useMemo(() => {
    const years = {};
    const sinFecha = [];
    
    (servicios || []).forEach(s => {
      if(!s.fechaInicio) {
        sinFecha.push(s);
        return;
      }
      const [y, m] = String(s.fechaInicio).split('-');
      if (!y || !m) {
        sinFecha.push(s);
        return;
      }
      if (!years[y]) years[y] = {};
      if (!years[y][m]) years[y][m] = [];
      years[y][m].push(s);
    });
    return { years, sinFecha };
  }, [servicios]);

  const getServiceTotals = (idServicio, descuentoData = 0) => {
    const items = cotizaciones.filter(c => c.servicioId === idServicio);
    const subtotalBruto = items.reduce((acc, c) => acc + c.subtotal, 0);
    const descuentoMonto = subtotalBruto * (descuentoData / 100);
    const neto = subtotalBruto - descuentoMonto;
    const iva = neto * 0.19;
    return { neto, total: neto + iva };
  };

  const formatCurrency = (val, currencyCode = 'CLP') => {
    return new Intl.NumberFormat(currencyCode === 'CLP' ? 'es-CL' : (currencyCode === 'USD' ? 'en-US' : 'es-PE'), { 
      style: 'currency', 
      currency: currencyCode,
      minimumFractionDigits: currencyCode === 'CLP' ? 0 : 2
    }).format(val);
  };

  const calculateStageTotal = (servicesInStage) => {
    return servicesInStage.reduce((acc, s) => acc + getServiceTotals(s.idServicio, s.descuento || 0).total, 0);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.5rem' }}>Pipeline de Ventas (Archivos)</h1>
          <p style={{ color: 'var(--text-muted)' }}>Despliega las carpetas por Año y Mes para acceder a los eventos.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button className="btn btn-primary" onClick={openNewModal}>
            <Plus size={18} /> Nuevo Servicio
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {servicios.length === 0 && (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No hay servicios registrados.</div>
        )}

        {/* Sección de Servicios Sin Fecha */}
        {groupedData.sinFecha.length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            <div 
              className="glass-panel" 
              style={{ 
                display: 'flex', alignItems: 'center', padding: '1rem 1.5rem', 
                borderLeft: '4px solid var(--text-muted)', marginBottom: '1rem', gap: '1rem', background: 'rgba(255,255,255,0.02)'
              }}
            >
                <CalendarDays size={24} color="var(--text-muted)"/>
                <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-muted)' }}>Eventos por Programar / Sin Fecha</h2>
                <span style={{ marginLeft: 'auto', background: 'var(--bg-panel)', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.8rem' }}>
                  {groupedData.sinFecha.length} pendientes
                </span>
            </div>
            <div style={{ paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
               {STAGES.map(stage => {
                  const stageServices = groupedData.sinFecha.filter(s => s.etapa === stage);
                  if (stageServices.length === 0) return null;
                  return (
                    <div key={stage} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                       <h4 style={{ color: getStageColor(stage), fontSize: '0.9rem', marginBottom: '0.2rem' }}>{stage} (Sin Fecha)</h4>
                       {stageServices.map(s => (
                         <div key={s.idServicio} style={{ 
                           display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                           padding: '1rem', background: 'var(--bg-dark)', borderRadius: 'var(--radius-sm)',
                           border: '1px solid var(--border-color)', gap: '1rem', flexWrap: 'wrap'
                         }}>
                            <div style={{ flex: '1 1 250px' }}>
                              <h5 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}>
                                {s.idServicio} <span className="text-muted" style={{ fontWeight: 400, fontSize: '0.8rem' }}>— {getClientName(s.clienteId)}</span>
                              </h5>
                              <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><MapPin size={13}/> {s.direccionEvento || 'Ubicación pendiente'}</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--color-banana)' }}><Clock size={13}/> Fecha por definir</span>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                               <button className="btn btn-primary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }} onClick={() => navigate('cotizaciones', { servicioId: s.idServicio })}>
                                 <CheckCircle size={15}/> Cotizar
                               </button>
                               <button className="btn btn-ghost" onClick={() => openEditModal(s)}><Edit2 size={15}/></button>
                            </div>
                         </div>
                       ))}
                    </div>
                  );
               })}
            </div>
          </div>
        )}

        {Object.keys(groupedData.years).sort((a, b) => b.localeCompare(a)).map(year => {
          const isYearExpanded = !!expandedYears[year];
          
          return (
            <div key={year} style={{ display: 'flex', flexDirection: 'column' }}>
              {/* Carpeta del Año */}
              <div 
                className="glass-panel" 
                onClick={() => toggleYear(year)}
                style={{ 
                  display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '1rem 1.5rem', 
                  borderLeft: '4px solid var(--accent-primary)', marginBottom: isYearExpanded ? '1rem' : '1rem',
                  gap: '1rem', transition: 'var(--transition)'
                }}
              >
                  {isYearExpanded ? <FolderOpen size={24} color="var(--accent-primary)"/> : <Folder size={24} color="var(--text-muted)"/>}
                  <h2 style={{ margin: 0, fontSize: '1.4rem' }}>{year}</h2>
                  {isYearExpanded ? <ChevronDown size={20} color="var(--text-muted)" style={{ marginLeft: 'auto' }}/> : <ChevronRight size={20} color="var(--text-muted)" style={{ marginLeft: 'auto' }}/>}
              </div>

              {/* Sub-carpetas de Meses */}
              {isYearExpanded && (
                <div style={{ paddingLeft: '1.5rem', borderLeft: '2px solid rgba(255,255,255,0.05)', marginLeft: '1rem', marginBottom: '1rem' }}>
                   {Object.keys(groupedData.years[year]).sort().reverse().map(month => {
                      const monthKey = `${year}-${month}`;
                      const isMonthExpanded = !!expandedMonths[monthKey];
                      const monthServices = groupedData.years[year][month];

                      return (
                        <div key={monthKey} style={{ marginBottom: isMonthExpanded ? '1.5rem' : '0.8rem' }}>
                           {/* Carpeta del Mes */}
                           <div
                             className="glass-panel"
                             onClick={() => toggleMonth(monthKey)}
                             style={{ 
                               display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '0.8rem 1.5rem', 
                               background: 'var(--bg-dark)', gap: '1rem', borderLeft: isMonthExpanded ? '3px solid var(--accent-secondary)' : '3px solid transparent'
                             }}
                           >
                              {isMonthExpanded ? <FolderOpen size={20} color="var(--accent-secondary)"/> : <Folder size={20} color="var(--text-muted)"/>}
                              <h3 style={{ margin: 0, fontSize: '1.1rem', color: isMonthExpanded ? 'var(--text-main)' : 'var(--text-muted)' }}>
                                {monthNames[month]}
                              </h3>
                              <span style={{ background: 'var(--bg-panel)', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.8rem' }}>
                                {monthServices.length} servicios
                              </span>
                              {isMonthExpanded ? <ChevronDown size={18} color="var(--text-muted)" style={{ marginLeft: 'auto' }}/> : <ChevronRight size={18} color="var(--text-muted)" style={{ marginLeft: 'auto' }}/>}
                           </div>

                           {/* Renderizado del Flujo (STAGES) dentro del mes */}
                           {isMonthExpanded && (
                              <div style={{ marginLeft: '1rem', paddingLeft: '1.5rem', borderLeft: '2px solid rgba(255,255,255,0.05)', marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                 {STAGES.map((stage) => {
                                    const stageServices = monthServices.filter(s => s.etapa === stage);
                                    const isExpanded = expandedStage === stage || expandedStage === null;
                                    
                                    return (
                                      <div key={stage} className="glass-panel" style={{ overflow: 'hidden', padding: 0 }}>
                                        {/* Header de Etapa */}
                                        <div 
                                          style={{ 
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                                            padding: '0.8rem 1.2rem', cursor: 'pointer', background: 'rgba(255,255,255,0.01)',
                                            borderLeft: `4px solid ${getStageColor(stage)}`
                                          }}
                                          onClick={() => toggleStage(stage)}
                                        >
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                                            <h4 style={{ margin: 0, color: getStageColor(stage) }}>{stage}</h4>
                                            <span style={{ background: 'var(--bg-dark)', padding: '0.2rem 0.5rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>
                                              {stageServices.length}
                                            </span>
                                            {stageServices.length > 0 && (
                                              <span style={{ marginLeft: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                                Total Acumulado: <strong style={{ color: 'var(--text-main)' }}>{formatCurrency(calculateStageTotal(stageServices), 'CLP')}</strong>
                                              </span>
                                            )}
                                          </div>
                                          <button className="btn btn-ghost" style={{ padding: '0.2rem', border: 'none' }}>
                                            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                          </button>
                                        </div>

                                        {/* Tarjetas de Servicio */}
                                        {isExpanded && (
                                          <div style={{ padding: '0 1.2rem 1.2rem 1.2rem', display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '0.5rem' }}>
                                            {stageServices.length === 0 ? (
                                              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', margin: '0.5rem 0' }}>Vacío</p>
                                            ) : (
                                              stageServices.map(s => (
                                                <div key={s.idServicio} style={{ 
                                                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                                                  padding: '1rem', background: 'var(--bg-dark)', borderRadius: 'var(--radius-sm)',
                                                  border: '1px solid var(--border-color)', gap: '1rem', flexWrap: 'wrap'
                                                }}>
                                                   {/* Info Principal */}
                                                  <div style={{ flex: '1 1 250px', minWidth: '200px' }}>
                                                    <h5 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', flexWrap: 'wrap' }}>
                                                      {s.idServicio} <span className="text-muted" style={{ fontWeight: 400, fontSize: '0.8rem' }}>— {getClientName(s.clienteId)}</span>
                                                    </h5>
                                                    <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem', flexWrap: 'wrap', marginBottom: '0.8rem' }}>
                                                       <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><MapPin size={13}/> {s.direccionEvento}</span>
                                                       <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><CalendarDays size={13}/> Inicio: {(s.fechaInicio || '').replace('T', ' ')}</span>
                                                    </div>
                                                    {(() => {
                                                       const { neto, total } = getServiceTotals(s.idServicio, s.descuento || 0);
                                                       const currency = s.moneda || 'CLP';

                                                       const sQuotations = cotizaciones.filter(c => c.servicioId === s.idServicio);
                                                       let audifonos = 0;
                                                       let transmisores = 0;
                                                       sQuotations.forEach(q => {
                                                         const eq = inventario?.find(i => i.idEquipo === q.equipoId);
                                                         if (eq) {
                                                            if (eq.categoria === 'Audio' || eq.nombreEquipo.toLowerCase().includes('audífono') || eq.nombreEquipo.toLowerCase().includes('audifono')) audifonos += q.cantidad;
                                                            else if (eq.categoria === 'Transmisión' || eq.nombreEquipo.toLowerCase().includes('transmisor') || eq.nombreEquipo.toUpperCase().includes('TX')) transmisores += q.cantidad;
                                                         }
                                                       });

                                                       return (
                                                         <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                                           {(audifonos > 0 || transmisores > 0) && (
                                                             <div style={{ display: 'flex', gap: '0.8rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                                {audifonos > 0 && <span style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>🎧 Audífonos: <strong>{audifonos}</strong></span>}
                                                                {transmisores > 0 && <span style={{ background: 'rgba(234, 179, 8, 0.1)', color: '#facc15', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>📡 Transmisores (TX): <strong>{transmisores}</strong></span>}
                                                             </div>
                                                           )}
                                                           <div style={{ display: 'flex', gap: '0.8rem', fontSize: '0.8rem', flexWrap: 'wrap' }}>
                                                             <span style={{ background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>Neto: <strong style={{ color: 'var(--text-main)' }}>{formatCurrency(neto, currency)}</strong></span>
                                                             <span style={{ background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>Total c/IVA: <strong style={{ color: 'var(--accent-primary)' }}>{formatCurrency(total, currency)}</strong></span>
                                                           </div>
                                                         </div>
                                                       );
                                                    })()}
                                                  </div>

                                                  {/* Controles para cambiar de etapa fácilmente en lista */}
                                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                                                    <select 
                                                      className="input-control" 
                                                      style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', width: '130px' }}
                                                      value={s.etapa}
                                                      onChange={(e) => updateServiceStage(s.idServicio, e.target.value)}
                                                    >
                                                      {STAGES.map(st => <option key={st} value={st}>{st}</option>)}
                                                    </select>
                                                    
                                                    <button 
                                                       className="btn btn-ghost" 
                                                       style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', color: 'var(--text-muted)' }} 
                                                       onClick={() => openEditModal(s)}
                                                    >
                                                      <Edit2 size={15}/>
                                                    </button>
                                                    
                                                    <button 
                                                       className="btn btn-ghost" 
                                                       style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', color: 'var(--color-tomato)' }} 
                                                       onClick={() => { if(window.confirm('¿Deseas eliminar definitivamente esta tarea y todas sus cotizaciones asociadas?')) removeServicio(s.idServicio) }}
                                                    >
                                                      <Trash2 size={15}/>
                                                    </button>

                                                    <button 
                                                       className="btn btn-primary" 
                                                       style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }} 
                                                       onClick={() => navigate('cotizaciones', { servicioId: s.idServicio })}
                                                    >
                                                      <CheckCircle size={15}/> Cotizar
                                                    </button>
                                                  </div>
                                                </div>
                                              ))
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                 })}
                              </div>
                           )}
                        </div>
                      )
                   })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Modal Agregar / Editar Servicio */}
      {isModalOpen && (
        <div className="modal-overlay">
           <div className="modal-content">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                 <h2 style={{ margin: 0, fontSize: '1.3rem' }}>{editMode ? `Editar Servicio ${editingId}` : 'Agregar Nuevo Servicio'}</h2>
                 <button className="btn btn-ghost" style={{ padding: '0.4rem', border: 'none' }} onClick={() => setIsModalOpen(false)}>
                    <X size={20} />
                 </button>
              </div>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                 
                 <div className="input-group" style={{ margin: 0 }}>
                   <label className="input-label">Seleccionar Cliente/Empresa</label>
                   <input 
                     type="text" 
                     className="input-control" 
                     placeholder="🔍 Buscar por nombre o empresa..." 
                     value={searchTerm} 
                     onChange={e => setSearchTerm(e.target.value)} 
                     style={{ marginBottom: '0.5rem' }}
                   />
                   <select required className="input-control" value={formData.clienteId} onChange={e => setFormData({...formData, clienteId: e.target.value})}>
                     <option value="" disabled>-- Elige un cliente --</option>
                     {filteredSortedClientes.map(c => (
                       <option key={c.id} value={c.id}>
                         {c.empresa ? `${c.empresa} - ` : ''}{c.nombre} {c.apellido}
                       </option>
                     ))}
                   </select>
                 </div>

                 <div className="input-group" style={{ margin: 0 }}>
                   <label className="input-label">Dirección del Evento (Venue)</label>
                   <input type="text" className="input-control" placeholder="Lugar, comuna, ciudad..." value={formData.direccionEvento} onChange={e => setFormData({...formData, direccionEvento: e.target.value})} />
                 </div>

                 <div className="responsive-flex-column" style={{ display: 'flex', gap: '1rem' }}>
                   <div className="input-group" style={{ flex: 1, margin: 0 }}>
                     <label className="input-label">Fecha y Hora de Inicio</label>
                     <div style={{ display: 'flex', gap: '0.5rem' }}><input type="date" className="input-control" value={formData.fechaInicioDate} onChange={e => setFormData({...formData, fechaInicioDate: e.target.value})} /><input type="time" className="input-control" value={formData.fechaInicioTime} onChange={e => setFormData({...formData, fechaInicioTime: e.target.value})} /></div>
                   </div>
                   <div className="input-group" style={{ flex: 1, margin: 0 }}>
                     <label className="input-label">Fecha y Hora de Fin</label>
                     <div style={{ display: 'flex', gap: '0.5rem' }}><input type="date" className="input-control" value={formData.fechaFinDate} onChange={e => setFormData({...formData, fechaFinDate: e.target.value})} /><input type="time" className="input-control" value={formData.fechaFinTime} onChange={e => setFormData({...formData, fechaFinTime: e.target.value})} /></div>
                   </div>
                 </div>
                 
                 <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setIsModalOpen(false)}>Cancelar</button>
                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                       {editMode ? 'Guardar Cambios' : 'Crear Servicio'}
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}

    </div>
  );
};

export default KanbanBoard;
