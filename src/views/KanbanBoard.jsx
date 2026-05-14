import React, { useState, useMemo } from 'react';
// v1.1 - Added Invoice Linking UI
import { useAppStore } from '../context/AppDataContext';
import { ChevronDown, ChevronRight, Search, Plus, Calendar, X, MapPin, CalendarDays, CheckCircle, Edit2, Trash2, DollarSign, FileText, ExternalLink, Upload, Folder, File as FileIcon, ArrowLeft, Eye, Mail } from 'lucide-react';

const STAGES = ['Cotizado', 'Aprobado', 'Por Cobrar', 'Pagado'];

const KanbanBoard = () => {
  const { servicios, updateServiceStage, removeServicio, editServicio, updateServiceInvoice, uploadServiceInvoiceFile, listDriveContentAction, clientes, cotizaciones, inventario, navigate, formatDateDDMMYYYY, selectedKanbanMonth, isArchived, togglePagoAdelanto, addServicio, handleCalendarSync, isGoogleLinked, linkGoogle } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedStage, setExpandedStage] = useState('Cotizado');

  // Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [invoiceData, setInvoiceData] = useState({ folio: '', url: '' });
  const [isUploading, setIsUploading] = useState(false);

  // Drive Picker States
  const [showDrivePicker, setShowDrivePicker] = useState(false);
  const [driveFolders, setDriveFolders] = useState([]);
  const [driveFiles, setDriveFiles] = useState([]);
  // Preview State
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');

  const handleSendCollectionEmail = (s) => {
    const client = clientes?.find(c => c.id === s.clienteId);
    const toEmail = client?.correo || '';
    
    const currentHour = new Date().getHours();
    const greeting = currentHour < 12 ? 'muy buenos días' : 'muy buenas tardes';
    
    const eventDate = s.fechaInicio ? formatDateDDMMYYYY(s.fechaInicio) : 'fecha por definir';

    const invoices = parseInvoices(s.urlFactura, s.folioFactura);
    const documentName = invoices.length > 0 && invoices[0].folio ? invoices[0].folio : 'Factura';

    const subject = `EcoSilence - ${documentName} - ${s.idServicio}`;
    const body = `Hola ${greeting}, Espero te encuentres bien.

Te envío la factura correspondiente al servicio de audífonos del día ${eventDate}, adjunto a este correo, encontrarás el documento en formato PDF.

Aquí tienes los detalles para el pago:
Cuenta bancaria:
EcoSilence SpA
77510784-7
Banco de Chile
Cuenta Corriente
2370997310
info@ecosilence.cl

Si tienes alguna pregunta o necesitas alguna aclaración sobre la factura, no dudes en responder a este correo o contactarnos directamente.

¡Gracias por tu confianza!

Saludos,
Camilo Collante.
Director ejecutivo.
+56 9 5379 9875
Pintor Laureano Guevara 60, La Reina.

https://www.ecosilence.cl/`;

    const mailtoLink = `mailto:${toEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoLink;
  };

  // Attached invoices list
  const [attachedInvoices, setAttachedInvoices] = useState([]);

  const parseInvoices = (urlFactura, folioFactura) => {
    if (!urlFactura) return [];
    try {
      if (typeof urlFactura === 'string' && urlFactura.trim().startsWith('[')) {
        return JSON.parse(urlFactura);
      }
    } catch(e) {}
    return [{ folio: folioFactura || '', url: urlFactura }];
  };

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
    let result = (servicios || []).filter(s => !isArchived(s));

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

    // Ordenar de menor a mayor (más antiguo a más reciente)
    result.sort((a, b) => {
      if (!a.fechaInicio) return 1;
      if (!b.fechaInicio) return -1;
      return a.fechaInicio < b.fechaInicio ? -1 : 1;
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

  const openEditModal = (s) => {
    // Splitear fechas para los inputs separados
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

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditingService(prev => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    
    // Combinar fecha y hora
    let fechaInicio = '';
    if (editingService.tempFecha) {
      fechaInicio = editingService.tempHora ? `${editingService.tempFecha}T${editingService.tempHora}` : editingService.tempFecha;
    }

    let fechaFin = '';
    if (editingService.tempFechaFin) {
      fechaFin = editingService.tempHoraFin ? `${editingService.tempFechaFin}T${editingService.tempHoraFin}` : editingService.tempFechaFin;
    }

    const updated = { ...editingService, fechaInicio, fechaFin };
    delete updated.tempFecha; delete updated.tempHora; delete updated.tempFechaFin; delete updated.tempHoraFin;

    editServicio(editingService.idServicio, updated);
    setIsEditModalOpen(false);
    setEditingService(null);
  };

  const openInvoiceModal = (s) => {
    setEditingService(s);
    setAttachedInvoices(parseInvoices(s.urlFactura, s.folioFactura));
    setInvoiceData({ folio: '', url: '' });
    setIsInvoiceModalOpen(true);
  };

  const handleInvoiceSubmit = async (e) => {
    e.preventDefault();
    const ok = await updateServiceInvoice(editingService.idServicio, attachedInvoices);
    if (ok) setIsInvoiceModalOpen(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    const url = await uploadServiceInvoiceFile(editingService.idServicio, file);
    if (url) {
      // Use user inputted folio, or the uploaded file's name without extension
      let defaultFolio = file.name.replace(/\.[^/.]+$/, "");
      const folio = invoiceData.folio || defaultFolio;
      setAttachedInvoices(prev => [...prev, { folio, url }]);
      setInvoiceData({ folio: '', url: '' });
    }
    setIsUploading(false);
  };

  const fetchDriveContent = async (id = null) => {
    setDriveLoading(true);
    try {
      const res = await listDriveContentAction(id, 'pdf');
      setDriveFolders(res.folders || []);
      setDriveFiles(res.files || []);
    } finally { setDriveLoading(false); }
  };

  const openDrivePicker = () => {
    setShowDrivePicker(true);
    fetchDriveContent(drivePath[drivePath.length - 1].id);
  };

  const selectDriveFile = (file) => {
    // Use user inputted folio, or the drive file's name without extension
    let defaultFolio = file.name ? file.name.replace(/\.[^/.]+$/, "") : `Factura Drive`;
    const folio = invoiceData.folio || defaultFolio;
    setAttachedInvoices(prev => [...prev, { folio, url: file.link }]);
    setInvoiceData({ folio: '', url: '' });
    setShowDrivePicker(false);
  };

  const openPreview = (url) => {
    setPreviewUrl(url);
    setIsPreviewModalOpen(true);
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

      {!isGoogleLinked && localStorage.getItem('google_calendar_linked') === 'true' && (
        <div style={{ background: 'rgba(251, 191, 36, 0.1)', border: '1px solid var(--color-banana)', padding: '1rem', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--color-banana)' }}>
            <Calendar size={20} />
            <span style={{ fontSize: '0.9rem' }}>Tu sesión de Google ha expirado. <strong>Los cambios no se sincronizarán</strong> hasta que vuelvas a vincular tu cuenta.</span>
          </div>
          <button className="btn btn-primary" style={{ background: 'var(--color-banana)', color: '#000', padding: '0.4rem 1rem', fontSize: '0.8rem' }} onClick={linkGoogle}>Re-vincular ahora</button>
        </div>
      )}

      {!isGoogleLinked && !localStorage.getItem('google_calendar_linked') && (
        <div style={{ background: 'rgba(99, 102, 241, 0.05)', border: '1px solid var(--accent-primary)', padding: '1rem', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--accent-primary)' }}>
            <Calendar size={20} />
            <span style={{ fontSize: '0.9rem' }}>Google Calendar no está vinculado. Vincúlalo para ver tus servicios en tu agenda personal.</span>
          </div>
          <button className="btn btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }} onClick={linkGoogle}>Vincular Google</button>
        </div>
      )}

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
                          const name = eq.nombreEquipo.toLowerCase();
                          if (name.includes('audífono') || name.includes('audifono')) {
                            audifonos += q.cantidad;
                          } else if (name.includes('transmisor') || name.includes(' tx') || name.startsWith('tx') || name.includes('-tx')) {
                            transmisores += q.cantidad;
                          }
                        }
                      });

                      return (
                        <div key={s.idServicio} style={{ 
                          display: 'flex', flexDirection: 'column', gap: '1rem',
                          padding: '1rem 1.2rem', background: 'var(--bg-dark)', borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-color)', borderLeft: `4px solid ${getStageColor(stage)}`
                        }}>
                          {/* Fila 1: ID - Cliente y Equipos */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                            <h5 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.05rem', flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 700 }}>{s.idServicio}</span> 
                              <span className="text-muted" style={{ fontWeight: 400 }}>— {getClientName(s.clienteId)}</span>
                              {s.pagoAdelanto && <span style={{ background: 'var(--color-basil)', color: '#fff', fontSize: '0.65rem', padding: '0.2rem 0.5rem', borderRadius: '4px', marginLeft: '0.5rem', fontWeight: 600 }}>RESERVA PAGADA</span>}
                            </h5>
                            
                            {(audifonos > 0 || transmisores > 0) && (
                              <div style={{ display: 'flex', gap: '0.8rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                {audifonos > 0 && <span style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', padding: '0.3rem 0.8rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>🎧 Audífonos: <strong style={{color: '#fff'}}>{audifonos}</strong></span>}
                                {transmisores > 0 && <span style={{ background: 'rgba(234, 179, 8, 0.1)', color: '#facc15', padding: '0.3rem 0.8rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>📡 Transmisores (TX): <strong style={{color: '#fff'}}>{transmisores}</strong></span>}
                              </div>
                            )}
                          </div>

                          {/* Fila 2: Dirección/Fecha y Valores */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', color: 'var(--text-muted)' }}>
                            <div style={{ display: 'flex', gap: '1.2rem', fontSize: '0.85rem' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><MapPin size={14}/> {s.direccionEvento || 'Sin dirección'}</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><CalendarDays size={14}/> Inicio: {s.fechaInicio ? formatDateDDMMYYYY(s.fechaInicio) : 'Por definir'}</span>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '0.8rem', fontSize: '0.9rem' }}>
                              <span style={{ background: 'rgba(255,255,255,0.03)', padding: '0.3rem 0.8rem', borderRadius: '4px' }}>Neto: <strong style={{ color: 'var(--text-main)' }}>{formatCurrency(neto, currency)}</strong></span>
                              <span style={{ background: 'rgba(255,255,255,0.03)', padding: '0.3rem 0.8rem', borderRadius: '4px' }}>Total c/IVA: <strong style={{ color: '#818cf8' }}>{formatCurrency(total, currency)}</strong></span>
                            </div>
                          </div>

                          {/* Fila 3: Controles */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                            <select className="input-control" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', width: 'auto', margin: 0, minWidth: '130px', fontWeight: 500 }} value={s.etapa} onChange={(e) => updateServiceStage(s.idServicio, e.target.value)}>
                              {STAGES.map(st => <option key={st} value={st}>{st}</option>)}
                            </select>

                            {s.etapa === 'Por Cobrar' && (
                              <button 
                                className="btn btn-ghost" 
                                style={{ padding: '0.4rem 0.6rem', color: '#60a5fa', border: '1px solid rgba(255,255,255,0.1)' }} 
                                onClick={(e) => { e.stopPropagation(); handleSendCollectionEmail(s); }}
                                title="Enviar correo de cobranza"
                              >
                                <Mail size={16}/>
                              </button>
                            )}
                            
                            <button 
                              className="btn" 
                              onClick={() => togglePagoAdelanto(s.idServicio)}
                              style={{ 
                                padding: '0.4rem 0.8rem', 
                                fontSize: '0.85rem', 
                                background: s.pagoAdelanto ? 'var(--color-basil)' : 'transparent',
                                border: s.pagoAdelanto ? 'none' : '1px solid var(--border-color)',
                                color: s.pagoAdelanto ? '#fff' : 'var(--text-muted)',
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                fontWeight: 600
                              }}
                              title="Marcar pago de reserva 50%"
                            >
                              <DollarSign size={14} /> 50%
                            </button>

                            <button 
                              className="btn btn-ghost" 
                              style={{ padding: '0.4rem 0.6rem', color: s.urlFactura ? 'var(--color-basil)' : 'var(--accent-primary)', border: '1px solid rgba(255,255,255,0.1)' }} 
                              onClick={() => openInvoiceModal(s)}
                              title="Vincular Factura SII"
                            >
                              <FileText size={16}/>
                            </button>

                            {parseInvoices(s.urlFactura, s.folioFactura).map((inv, idx) => (
                              <div key={idx} style={{ display: 'flex', gap: '0.2rem', alignItems: 'center', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', padding: '0.2rem' }}>
                                <button 
                                  className="btn btn-ghost" 
                                  style={{ padding: '0.2rem 0.4rem', color: '#818cf8' }}
                                  onClick={() => openPreview(inv.url)}
                                  title={`Previsualizar Factura ${inv.folio ? `#${inv.folio}` : ''}`}
                                >
                                  <Eye size={16}/>
                                </button>
                                <a 
                                  href={inv.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="btn btn-ghost" 
                                  style={{ padding: '0.2rem 0.4rem', color: 'var(--text-muted)' }}
                                  title={`Abrir Factura ${inv.folio ? `#${inv.folio}` : ''} en pestaña nueva`}
                                >
                                  <ExternalLink size={16}/>
                                </a>
                              </div>
                            ))}

                            {isGoogleLinked && (
                              <button 
                                className="btn btn-ghost" 
                                style={{ padding: '0.4rem 0.6rem', color: s.googleEventId ? 'var(--color-basil)' : 'var(--accent-primary)', border: '1px solid rgba(255,255,255,0.1)' }} 
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  const ok = await handleCalendarSync(s, sQuotations);
                                  if(ok) alert('Sincronización exitosa con Google Calendar');
                                }}
                                title={s.googleEventId ? "Actualizar en Google Calendar" : "Sincronizar con Google Calendar"}
                              >
                                <Calendar size={16}/>
                              </button>
                            )}

                            <button className="btn btn-ghost" style={{ padding: '0.4rem 0.6rem', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.1)' }} onClick={() => openEditModal(s)}><Edit2 size={16}/></button>
                            <button className="btn btn-ghost" style={{ padding: '0.4rem 0.6rem', color: 'var(--color-tomato)', border: '1px solid rgba(255,255,255,0.1)' }} onClick={() => { if(window.confirm('¿Deseas eliminar definitivamente esta tarea y todas sus cotizaciones asociadas?')) removeServicio(s.idServicio) }}><Trash2 size={16}/></button>
                            
                            <button className="btn btn-primary" style={{ padding: '0.4rem 1.2rem', fontSize: '0.85rem', fontWeight: 600, background: '#a855f7', color: '#fff' }} onClick={() => navigate('cotizaciones', { servicioId: s.idServicio, from: 'kanban' })}>
                              <CheckCircle size={16}/> Cotizar
                            </button>
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
      {/* Modal para Vincular Factura */}
      {isInvoiceModalOpen && editingService && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: showDrivePicker ? '600px' : '450px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}>
                {showDrivePicker ? 'Seleccionar desde Drive' : 'Vincular Factura SII'}
              </h2>
              <button className="btn btn-ghost" onClick={() => { 
                if(showDrivePicker) setShowDrivePicker(false);
                else setIsInvoiceModalOpen(false); 
              }}><X size={20} /></button>
            </div>

            {!showDrivePicker ? (
              <>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                  Sube un PDF desde tu PC o selecciona un archivo de tu Google Drive para el servicio <strong>{editingService.idServicio}</strong>.
                </p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                  {attachedInvoices.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Facturas Adjuntas</label>
                      {attachedInvoices.map((inv, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.8rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                            <FileText size={16} color="var(--accent-primary)" />
                            <span>Folio: {inv.folio || 'N/A'}</span>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="btn btn-ghost" style={{ padding: '0.3rem' }} onClick={() => openPreview(inv.url)}><Eye size={16}/></button>
                            <button className="btn btn-ghost" style={{ padding: '0.3rem', color: 'var(--color-danger)' }} onClick={() => setAttachedInvoices(attachedInvoices.filter((_, i) => i !== idx))}><Trash2 size={16}/></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ height: '1px', background: 'var(--border-color)', margin: '0.5rem 0' }}></div>
                  <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Agregar Nueva Factura</label>
                  
                  <div className="form-group">
                    <label>Número de Folio (Opcional)</label>
                    <input 
                      type="text" 
                      className="input-control" 
                      placeholder="Ej: 1245" 
                      value={invoiceData.folio} 
                      onChange={(e) => setInvoiceData({...invoiceData, folio: e.target.value})} 
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <label className="btn btn-ghost" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', padding: '1.2rem', borderRadius: '8px', border: '1px dashed var(--border-color)' }}>
                      <Upload size={18} /> {isUploading ? 'Subiendo archivo, por favor espera...' : 'Haz clic aquí para subir PDF desde tu PC'}
                      <input type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handleFileUpload} disabled={isUploading} />
                    </label>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                    <button type="button" className="btn btn-ghost" onClick={() => setIsInvoiceModalOpen(false)}>Cancelar</button>
                    <button type="button" className="btn btn-primary" onClick={handleInvoiceSubmit}>Guardar Todo</button>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '400px', overflowY: 'auto' }}>
                <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  {drivePath.map((p, i) => (
                    <span key={i} onClick={() => { setDrivePath(drivePath.slice(0, i+1)); fetchDriveContent(p.id); }} style={{ cursor: 'pointer', color: i === drivePath.length - 1 ? 'var(--accent-primary)' : 'inherit' }}>
                      {p.name} {i < drivePath.length - 1 && ' / '}
                    </span>
                  ))}
                </div>

                {driveLoading ? (
                  <div style={{ textAlign: 'center', padding: '2rem' }}>Cargando contenido...</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem' }}>
                    {driveFolders.length === 0 && driveFiles.length === 0 && <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>No se encontraron carpetas o archivos PDF.</div>}
                    
                    {driveFolders.map(f => (
                      <div key={f.id} onClick={() => { setDrivePath([...drivePath, f]); fetchDriveContent(f.id); }} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.8rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', cursor: 'pointer', border: '1px solid var(--border-color)' }}>
                        <Folder size={18} color="var(--accent-primary)" />
                        <span style={{ fontSize: '0.9rem' }}>{f.name}</span>
                      </div>
                    ))}
                    
                    {driveFiles.map(file => (
                      <div key={file.id} onClick={() => selectDriveFile(file)} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.8rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', cursor: 'pointer', border: '1px solid var(--border-color)' }}>
                        <FileIcon size={18} color="var(--color-tomato)" />
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                          <span style={{ fontSize: '0.9rem' }}>{file.name}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{file.size} — {file.date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <button className="btn btn-ghost" style={{ marginTop: '1rem' }} onClick={() => setShowDrivePicker(false)}>
                  <ArrowLeft size={16} /> Volver
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal para Previsualizar PDF */}
      {isPreviewModalOpen && (
        <div className="modal-overlay" onClick={() => setIsPreviewModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '900px', width: '95%', height: '90vh', padding: '1rem', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Previsualización de Factura</h3>
              <button className="btn btn-ghost" onClick={() => setIsPreviewModalOpen(false)}><X size={20} /></button>
            </div>
            <div style={{ flex: 1, background: '#fff', borderRadius: '8px', overflow: 'hidden' }}>
              <iframe 
                src={previewUrl} 
                style={{ width: '100%', height: '100%', border: 'none' }}
                title="Invoice Preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KanbanBoard;
