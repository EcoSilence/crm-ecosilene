import React, { useState, useEffect } from 'react';
import { useAppStore } from '../context/AppDataContext';
import { FileText, Plus, MapPin, CalendarDays, DollarSign, Download, Trash2, Box, Mail, Printer, X, Save, ArrowLeft } from 'lucide-react';

const CotizacionesView = () => {
  const { 
    servicios, clientes, inventario, cotizaciones, 
    addItemCotizacion, removeItemCotizacion, editItemCotizacion, 
    updateServiceDiscount, updateServiceCurrency, viewParams, getStockActual, navigate, menuNames
  } = useAppStore();
  
  // Servicio seleccionado para cotizar
  const [selectedServicioId, setSelectedServicioId] = useState(viewParams?.servicioId || '');

  // Formulario de ítem (equipo) a añadir
  const [formData, setFormData] = useState({ equipoId: '', cantidad: 1, dias: 1, precioUnitario: 0, descripcion: '' });

  // Modal de previsualización Voucher Print
  const [showPreview, setShowPreview] = useState(false);

  // Update selected service if viewParams changes
  useEffect(() => {
    if (viewParams && viewParams.servicioId) {
      setSelectedServicioId(viewParams.servicioId);
    }
  }, [viewParams]);

  const servicio = servicios.find(s => s.idServicio === selectedServicioId);
  const cliente = servicio ? clientes.find(c => c.id === servicio.clienteId) : null;
  const itemsCotizacion = cotizaciones.filter(c => c.servicioId === selectedServicioId);

  // Efecto absoluto para cambiar el title del DOM y persistirlo mientras la vista previa esté abierta
  useEffect(() => {
    let originalTitle = document.title;
    let originalTagText = '';
    const titleTag = document.querySelector('title');
    if (titleTag) originalTagText = titleTag.innerText;

    if (showPreview && servicio && cliente) {
       const clientName = cliente.empresa || `${cliente.nombre} ${cliente.apellido}`;
       const newTitle = `COT${servicio.idServicio} - ${clientName}`;
       document.title = newTitle;
       if (titleTag) titleTag.innerText = newTitle;
    }

    // El listener 'afterprint' también puede ayudar como fallback
    const handleAfterPrint = () => {
       // Opcional, pero dejaremos que el cierre del modal lo maneje
    };
    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
       document.title = originalTitle;
       if (titleTag) titleTag.innerText = originalTagText;
       window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [showPreview, servicio, cliente]);

  const subtotalBruto = itemsCotizacion.reduce((acc, curr) => acc + curr.subtotal, 0);
  const descuentoPorcentaje = servicio?.descuento || 0;
  const descuentoMonto = subtotalBruto * (descuentoPorcentaje / 100);
  const subtotalNeto = subtotalBruto - descuentoMonto;
  const iva = subtotalNeto * 0.19;
  const total = subtotalNeto + iva;
  const totales = { subtotalBruto, descuentoMonto, descuentoPorcentaje, subtotalNeto, iva, total };

  const formatCurrency = (val) => {
    const currencyCode = servicio?.moneda || 'CLP';
    return new Intl.NumberFormat(currencyCode === 'CLP' ? 'es-CL' : (currencyCode === 'USD' ? 'en-US' : 'es-PE'), { 
      style: 'currency', 
      currency: currencyCode,
      minimumFractionDigits: currencyCode === 'CLP' ? 0 : 2
    }).format(val);
  };

  const handleSelectEquipo = (e) => {
    const id = String(e.target.value);
    const inv = inventario.find(i => String(i.idEquipo) === id);
    setFormData(prev => ({
      ...prev,
      equipoId: id,
      descripcion: inv ? inv.nombreEquipo : '',
      precioUnitario: 0 
    }));
  };

  const handleAddItem = (e) => {
    e.preventDefault();
    if (!selectedServicioId) return alert('Selecciona un servicio primero');
    if (!formData.equipoId) return alert('Selecciona un equipo');
    
    addItemCotizacion({
      servicioId: selectedServicioId,
      ...formData
    });

    setFormData({ equipoId: '', cantidad: 1, dias: 1, precioUnitario: 0, descripcion: '' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '2rem' }}>
      {/* ESTILOS CRÍTICOS PARA IMPRESIÓN */}
      <style>{`
        @media print {
          /* Ocultar todo lo que no sea la cotización */
          body * { visibility: hidden !important; }
          .print-voucher-container, .print-voucher-container * { visibility: visible !important; }
          .print-voucher-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          .no-print { display: none !important; }
          
          /* Forzar colores de fondo y sombras */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          /* Ajustes de página */
          @page {
            size: A4;
            margin: 5mm;
          }
        }
      `}</style>

      <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {viewParams?.fromKanban && (
            <button 
              className="btn btn-ghost" 
              style={{ padding: '0.5rem 1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-dark)' }} 
              onClick={() => navigate('kanban')}
            >
              <ArrowLeft size={18} /> Volver al Flujo
            </button>
          )}
          <div>
            <h1 style={{ margin: 0, marginBottom: '0.3rem' }}>{menuNames.cotizaciones || 'Cotización y Facturación'}</h1>
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>Crea y gestiona presupuestos enlazados a tus servicios y eventos.</p>
          </div>
        </div>

      {/* Selector de Servicio */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <label className="input-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Vincular a Servicio del Pipeline:</label>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <select 
               className="input-control" 
               style={{ flex: 1, fontSize: '1rem', padding: '0.75rem 1rem' }}
               value={selectedServicioId}
               onChange={e => setSelectedServicioId(e.target.value)}
            >
              <option value="">-- Selecciona un Servicio / Proyecto --</option>
              {servicios.map(s => {
                const cli = clientes.find(c => c.id === s.clienteId);
                return <option key={s.idServicio} value={s.idServicio}>{s.idServicio} - {cli?.nombre} {cli?.empresa ? `(${cli?.empresa})` : ''} - {s.fechaInicio.split('T')[0]}</option>
              })}
            </select>
            {selectedServicioId && (
              <select 
                className="input-control" 
                style={{ width: '150px', fontSize: '1rem', padding: '0.75rem 1rem' }}
                value={servicio?.moneda || 'CLP'}
                onChange={e => updateServiceCurrency(selectedServicioId, e.target.value)}
              >
                <option value="CLP">CLP ($)</option>
                <option value="USD">USD ($)</option>
                <option value="PEN">PEN (S/)</option>
              </select>
            )}
          </div>
        </div>
      </div>

      {servicio && cliente ? (
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          {/* Detalles de la Cotización */}
          <div style={{ flex: '2 1 500px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Header Facturacion Info */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '2rem' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                 <div>
                   <h2 style={{ color: 'var(--accent-primary)', marginBottom: '0.5rem' }}>Presupuesto Comercial</h2>
                   <h3 style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>Servicio Ref: {servicio.idServicio}</h3>
                 </div>
                 <div style={{ textAlign: 'right' }}>
                   <p style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.2rem' }}>{cliente.empresa || `${cliente.nombre} ${cliente.apellido}`}</p>
                   <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{cliente.correo || 'Sin correo'}</p>
                   <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{cliente.direccionEmpresa || 'Sin dirección comercial'}</p>
                 </div>
               </div>
               
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'var(--bg-dark)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
                 <div>
                   <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.2rem' }}>Lugar del Evento</p>
                   <p style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem' }}><MapPin size={14}/> {servicio.direccionEvento}</p>
                 </div>
                 <div>
                   <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.2rem' }}>Fechas</p>
                   <p style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem' }}><CalendarDays size={14}/> {servicio.fechaInicio.replace('T', ' ')}</p>
                 </div>
               </div>

               {/* Table de items */}
               <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
                 <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                   <thead>
                     <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                       <th style={{ padding: '0.8rem 0' }}>Descripción</th>
                       <th style={{ padding: '0.8rem 0', textAlign: 'center' }}>Cant.</th>
                       <th style={{ padding: '0.8rem 0', textAlign: 'center' }}>Días</th>
                       <th style={{ padding: '0.8rem 0', textAlign: 'right' }}>P.Unitario</th>
                       <th style={{ padding: '0.8rem 0', textAlign: 'right' }}>Subtotal</th>
                       <th style={{ padding: '0.8rem 0' }}></th>
                     </tr>
                   </thead>
                   <tbody>
                     {itemsCotizacion.map(item => (
                       <tr key={item.idCotizacion} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                         <td style={{ padding: '1rem 0' }}>
                           <div style={{ fontWeight: 500 }}>{item.descripcion}</div>
                           <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{inventario.find(i=>i.idEquipo===item.equipoId)?.categoria}</div>
                         </td>
                         <td style={{ padding: '0.5rem 0', textAlign: 'center' }}>
                           <input type="number" min="1" className="input-control" style={{ width: '60px', padding: '0.4rem', textAlign: 'center', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)' }} value={item.cantidad} onChange={(e) => editItemCotizacion(item.idCotizacion, { cantidad: e.target.value })} />
                         </td>
                         <td style={{ padding: '0.5rem 0', textAlign: 'center' }}>
                           <input type="number" min="1" className="input-control" style={{ width: '60px', padding: '0.4rem', textAlign: 'center', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)' }} value={item.dias} onChange={(e) => editItemCotizacion(item.idCotizacion, { dias: e.target.value })} />
                         </td>
                          <td style={{ padding: '0.5rem 0', textAlign: 'right' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.2rem' }}>
                              <input type="number" min="0" className="input-control" style={{ width: '100px', padding: '0.4rem', textAlign: 'right', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)' }} value={item.precioUnitario} onChange={(e) => editItemCotizacion(item.idCotizacion, { precioUnitario: e.target.value })} />
                            </div>
                          </td>
                         <td style={{ padding: '1rem 0', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(item.subtotal)}</td>
                         <td style={{ padding: '1rem 0', textAlign: 'right' }}>
                           <button onClick={()=>removeItemCotizacion(item.idCotizacion)} style={{ background: 'none', border: 'none', color: 'var(--color-tomato)', cursor: 'pointer' }}><Trash2 size={16}/></button>
                         </td>
                       </tr>
                     ))}
                     {itemsCotizacion.length === 0 && (
                       <tr><td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Sin ítems en el presupuesto.</td></tr>
                     )}
                   </tbody>
                 </table>
               </div>

               {/* Totales */}
               <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem', borderTop: '2px solid var(--border-color)', paddingTop: '1.5rem' }}>
                 <div style={{ width: '250px' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--text-main)' }}>
                     <span>Subtotal:</span> <span>{formatCurrency(totales.subtotalBruto)}</span>
                   </div>
                   <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'center' }}>
                     <span style={{ color: 'var(--color-banana)' }}>Descuento (%):</span> 
                     <input type="number" min="0" max="100" className="input-control" style={{ width: '80px', padding: '0.3rem', textAlign: 'right' }} value={servicio?.descuento || 0} onChange={(e) => updateServiceDiscount(servicio.idServicio, e.target.value)} />
                   </div>
                   <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', color: 'var(--text-muted)' }}>
                     <span>IVA (19%):</span> <span>{formatCurrency(totales.iva)}</span>
                   </div>
                   <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                     <span>Total {servicio?.moneda || 'CLP'}:</span> <span>{formatCurrency(totales.total)}</span>
                   </div>
                 </div>
               </div>

               {/* Acciones Finales */}
               <div className="no-print" style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                 <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => alert('Cotización guardada exitosamente y sincronizada en el flujo de trabajo.')}><Save size={18}/> Guardar Cotización (Soft)</button>
                 <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setShowPreview(true)}><Download size={18}/> Generar PDF (Voucher)</button>
               </div>
            </div>
          </div>

          {/* Panel Lateral: Agregar Items */}
          <div style={{ flex: '1 1 300px' }}>
            <div className="glass-panel" style={{ padding: '1.5rem', position: 'sticky', top: '20px' }}>
              <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Box size={18}/> Añadir Equipamiento
              </h3>
              
              <form onSubmit={handleAddItem} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                 <div className="input-group" style={{ margin: 0 }}>
                   <label className="input-label">Seleccionar del Inventario</label>
                   <select required className="input-control" value={formData.equipoId || ""} onChange={handleSelectEquipo}>
                     <option value="" disabled>-- Elige un artículo --</option>
                     {inventario.map(e => {
                        let stockVirtual = 0;
                        try {
                           stockVirtual = getStockActual(e.idEquipo, servicio?.fechaInicio, servicio?.fechaFin, servicio?.idServicio);
                        } catch (err) { stockVirtual = e.stockTotal; }
                        
                        return (
                          <option key={`opt-${e.idEquipo}`} value={String(e.idEquipo)}>
                             {e.nombreEquipo} (Total: {e.stockTotal} | Disp: {stockVirtual})
                          </option>
                        );
                     })}
                   </select>
                 </div>

                 <div className="input-group" style={{ margin: 0 }}>
                   <label className="input-label">Descripción Personalizada</label>
                   <input required type="text" className="input-control" value={formData.descripcion} onChange={e => setFormData({...formData, descripcion: e.target.value})} />
                 </div>

                 <div style={{ display: 'flex', gap: '1rem' }}>
                   <div className="input-group" style={{ flex: 1, margin: 0 }}>
                     <label className="input-label">Cantidad</label>
                     <input required type="number" min="1" className="input-control" value={formData.cantidad} onChange={e => setFormData({...formData, cantidad: e.target.value})} />
                   </div>
                   <div className="input-group" style={{ flex: 1, margin: 0 }}>
                     <label className="input-label">Días de Arriendo</label>
                     <input required type="number" min="1" className="input-control" value={formData.dias} onChange={e => setFormData({...formData, dias: e.target.value})} />
                   </div>
                 </div>

                 <div className="input-group" style={{ margin: 0 }}>
                   <label className="input-label">Precio Unitario ({servicio?.moneda || 'CLP'})</label>
                   <input required type="number" min="0" step="any" className="input-control" value={formData.precioUnitario} onChange={e => setFormData({...formData, precioUnitario: e.target.value})} />
                 </div>

                 <button type="submit" className="btn btn-ghost" style={{ marginTop: '0.5rem', border: '1px dashed var(--accent-primary)', color: 'var(--accent-primary)' }}>
                   + Añadir al Presupuesto
                 </button>
              </form>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--bg-panel)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-color)', color: 'var(--text-muted)' }}>
          <FileText size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
          <h3>No hay un servicio seleccionado</h3>
          <p>Usa el menú desplegable superior o vincula un servicio desde el Pipeline para generar su cotización o factura.</p>
        </div>
      )}
      </div>

      {/* MODAL DE PREVISUALIZACION PDF VOUCHER */}
      {showPreview && servicio && cliente && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content print-voucher-container" style={{ width: '800px', maxWidth: '95vw', background: 'white', color: 'black', borderRadius: '4px', padding: 0 }}>
            {/* Header / Botones que NO se imprimen */}
            <div className="no-print" style={{ padding: '1rem 2rem', background: 'var(--bg-dark)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
               <h3 style={{ margin: 0, color: 'var(--text-main)' }}>Previsualización Voucher Documento</h3>
               <div style={{ display: 'flex', gap: '1rem' }}>
                 <button className="btn btn-ghost" onClick={() => {
                    const hour = new Date().getHours();
                    let greeting = "días";
                    if (hour >= 12 && hour < 20) greeting = "tardes";
                    if (hour >= 20 || hour < 5) greeting = "noches";
                    const subject = encodeURIComponent(`Cotización EcoSilence - ${servicio.idServicio}`);
                    const body = encodeURIComponent(`Hola ${cliente.nombre}, ¡buenos ${greeting}!, Espero que estés muy bien.
Te contacto de parte de EcoSilence para darte las gracias por tu interés en los eventos silenciosos. ¡Nos alegra mucho que quieras ser parte de esto!
Para que puedas ver todos los detalles, te adjuntamos la cotización que nos pediste.

_________________________________________________________________________________________
Terminos y condiciones para realizar la reserva de nuestro servicios:
• Pago anticipado del 50% iva incluido, saldo a la entrega.
• En caso de cancelación del evento, se tomará el 20% del 50% depositado con anterioridad y se devolverá el 30% restante.
• Aceptamos pagos con tarjetas de credito, debito o transferencias bancarias
• En caso de que hubiese, perdida, deterioro o destrucción, el monto asciende a $ 60.000 pesos por audífonos
• En caso de que hubiese, perdida, deterioro o destrucción del transmisor el monto asciende a $250.000 pesos por cada uno.
• El arriendo es por 12hrs o hasta que se acabe la batería de los audífonos (8 a 10 hrs)

Estamos a tu disposición para cualquier duda que tengas.
Camilo Collante.
EcoSilence Spa.
+56 9 5379 9875
Pintor Laureano Guevara 60, La Reina.

https://www.ecosilence.cl/
https://www.youtube.com/watch?v=M5Hv5z5rWaA`);
                    window.location.href = `mailto:${cliente.correo}?cc=info@ecosilence.cl&subject=${subject}&body=${body}`;
                 }}>
                   <Mail size={18}/> Enviar por Correo
                 </button>
                 <button className="btn btn-primary" onClick={() => window.print()}>
                   <Printer size={18}/> Imprimir / Guardar PDF
                 </button>
                 <button className="btn btn-ghost" onClick={() => setShowPreview(false)} style={{ border: 'none', padding: '0.4rem' }}>
                   <X size={20}/>
                 </button>
               </div>
            </div>
            {/* CUERPO DE LA COTIZACIÓN (Lo que se verá en el PDF) */}
            <div className="print-voucher-body" style={{ padding: '2.5cm 2cm 1.5cm 2cm', background: 'white', color: 'black', fontSize: '11pt', boxSizing: 'border-box', minHeight: '29.7cm', display: 'flex', flexDirection: 'column' }}>
              
              {/* Membrete Superior */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                  <div className="print-logo-container" style={{ width: '150px', height: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src="/logo.png" alt="EcoSilence Logo" style={{ width: '100%', height: 'auto', objectFit: 'contain' }} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>EcoSilence</h2>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Pintor Laureano Guevara 60, La Reina</p>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>RUT: 77.510.784-7 | info@ecosilence.cl</p>
                  </div>
                </div>
                
                <div style={{ textAlign: 'right', background: '#f8fafc', padding: '1.2rem', borderRadius: '12px', border: '1px solid #e2e8f0', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Documento Cotización</span>
                  <h3 style={{ fontSize: '1.5rem', margin: '0.1rem 0', color: '#4f46e5', fontWeight: 800 }}>#{servicio.idServicio}</h3>
                  <div style={{ height: '1px', background: '#e2e8f0', margin: '0.5rem 0' }}></div>
                  <p style={{ margin: 0, fontSize: '0.8rem' }}><strong>Fecha:</strong> {new Date().toLocaleDateString('es-CL')}</p>
                  <p style={{ margin: 0, fontSize: '0.8rem' }}><strong>Vence:</strong> {new Date(new Date().getTime() + 15*24*60*60*1000).toLocaleDateString('es-CL')}</p>
                </div>
              </div>

              {/* Grid de Información Cliente & Evento */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                <div style={{ padding: '1.2rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                  <h4 style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.8rem', letterSpacing: '0.05em' }}>Cliente / Empresa</h4>
                  <p style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.3rem 0', color: '#0f172a' }}>{cliente.empresa || `${cliente.nombre} ${cliente.apellido}`}</p>
                  <p style={{ fontSize: '0.9rem', margin: 0, color: '#334155' }}>{cliente.nombre} {cliente.apellido}</p>
                  <p style={{ fontSize: '0.9rem', margin: 0, color: '#334155' }}>{cliente.correo}</p>
                  <p style={{ fontSize: '0.9rem', margin: 0, color: '#334155' }}>{cliente.telefono}</p>
                </div>
                <div style={{ padding: '1.2rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.8rem', letterSpacing: '0.05em' }}>Detalles del Evento</h4>
                  <p style={{ fontSize: '0.9rem', margin: '0 0 0.4rem 0', color: '#334155' }}><strong>Dirección:</strong> {servicio.direccionEvento}</p>
                  <p style={{ fontSize: '0.9rem', margin: '0 0 0.4rem 0', color: '#334155' }}><strong>Fecha Evento:</strong> {servicio.fechaInicio.replace('T', ' ')}</p>
                  <p style={{ fontSize: '0.9rem', margin: 0, color: '#334155' }}><strong>Moneda:</strong> {servicio.moneda || 'CLP'}</p>
                </div>
              </div>

              {/* Tabla de Items */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                    <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.8rem', color: '#475569', textTransform: 'uppercase', border: '1px solid #e2e8f0' }}>Descripción Equipo / Servicio</th>
                    <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.8rem', color: '#475569', textTransform: 'uppercase', width: '70px', border: '1px solid #e2e8f0' }}>Cant.</th>
                    <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.8rem', color: '#475569', textTransform: 'uppercase', width: '70px', border: '1px solid #e2e8f0' }}>Días</th>
                    <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.8rem', color: '#475569', textTransform: 'uppercase', width: '120px', border: '1px solid #e2e8f0' }}>P. Unitario</th>
                    <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.8rem', color: '#475569', textTransform: 'uppercase', width: '120px', border: '1px solid #e2e8f0' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {itemsCotizacion.map((item) => (
                    <tr key={item.idCotizacion} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '0.8rem 1rem', fontSize: '0.95rem', fontWeight: 500, color: '#1e293b', border: '1px solid #e2e8f0' }}>{item.descripcion}</td>
                      <td style={{ padding: '0.8rem 1rem', textAlign: 'center', color: '#334155', border: '1px solid #e2e8f0' }}>{item.cantidad}</td>
                      <td style={{ padding: '0.8rem 1rem', textAlign: 'center', color: '#334155', border: '1px solid #e2e8f0' }}>{item.dias}</td>
                      <td style={{ padding: '0.8rem 1rem', textAlign: 'right', color: '#334155', border: '1px solid #e2e8f0' }}>{formatCurrency(item.precioUnitario)}</td>
                      <td style={{ padding: '0.8rem 1rem', textAlign: 'right', fontWeight: 700, color: '#0f172a', border: '1px solid #e2e8f0' }}>{formatCurrency(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totales y Notas */}
              <div style={{ display: 'flex', gap: '2rem', marginTop: 'auto' }}>
                <div style={{ flex: 1, fontSize: '0.8rem', color: '#64748b' }}>
                  <div style={{ background: '#f8fafc', padding: '1.2rem', borderRadius: '8px', borderLeft: '4px solid #4f46e5', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                    <h5 style={{ color: '#0f172a', margin: '0 0 0.6rem 0', fontSize: '0.9rem', textTransform: 'uppercase' }}>Términos y Condiciones</h5>
                    <ul style={{ paddingLeft: '1.2rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <li>Reserva: 50% de anticipo al confirmar, saldo contra entrega.</li>
                      <li>Cancelación: Cargo del 20% si se cancela con menos de 48 hrs.</li>
                      <li>Reposición: Audífono $60.000 / Transmisor $250.000 (en caso de pérdida).</li>
                      <li>Arriendo base: 24 horas por evento.</li>
                      <li>Esta cotización es válida por 15 días a partir de la fecha de emisión.</li>
                    </ul>
                  </div>
                </div>
                <div style={{ width: '300px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ color: '#64748b' }}>Subtotal:</span>
                    <span style={{ fontWeight: 600 }}>{formatCurrency(totales.subtotalBruto)}</span>
                  </div>
                  {totales.descuentoPorcentaje > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', color: '#ef4444', borderBottom: '1px solid #fee2e2' }}>
                      <span>Descuento ({totales.descuentoPorcentaje}%):</span>
                      <span style={{ fontWeight: 600 }}>- {formatCurrency(totales.descuentoMonto)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ color: '#64748b' }}>IVA (19%):</span>
                    <span style={{ fontWeight: 600 }}>{formatCurrency(totales.iva)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0.5rem', background: '#4f46e5', color: 'white', borderRadius: '4px', marginTop: '1rem', fontSize: '1.3rem', fontWeight: 800, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                    <span>Total General:</span>
                    <span>{formatCurrency(totales.total)}</span>
                  </div>
                </div>
              </div>

              {/* Footer de Pago */}
              <div style={{ marginTop: '2rem', textAlign: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem', fontSize: '0.75rem', color: '#94a3b8' }}>
                <p style={{ margin: '0 0 0.3rem 0' }}>EcoSilence SPA | RUT: 77.510.784-7 | Banco de Chile | Cuenta Corriente 00-023-709973-10 | info@ecosilence.cl</p>
                <p style={{ margin: 0, fontWeight: 600 }}>EcoSilence - Soluciones Audiovisuales Profesionales</p>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CotizacionesView;
