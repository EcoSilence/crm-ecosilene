import React, { useState, useEffect } from 'react';
import { useAppStore } from '../context/AppDataContext';
import { FileText, Plus, MapPin, CalendarDays, DollarSign, Download, Trash2, Box, Mail, Printer, X, Save } from 'lucide-react';

const CotizacionesView = () => {
  const { 
    servicios, clientes, inventario, cotizaciones, 
    addItemCotizacion, removeItemCotizacion, editItemCotizacion, 
    updateServiceDiscount, updateServiceCurrency, viewParams, getStockActual
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
      <div>
        <h1 style={{ marginBottom: '0.5rem' }}>Cotización y Facturación</h1>
        <p style={{ color: 'var(--text-muted)' }}>Crea y gestiona presupuestos enlazados a tus servicios y eventos.</p>
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
            {/* DOCUMENTO TIPO A4 (Lo que se imprime) */}
            <div style={{ padding: '2rem 3rem', minHeight: '1000px', display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'white', color: 'black' }}>
              
              {/* Accent Bar */}
              <div className="print-accent-bar"></div>

              {/* Encabezado Membrete Estilo Premium */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                 <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                    {/* Logo */}
                    <div style={{ width: '120px', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src="/logo.png" alt="EcoSilence Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                    </div>
                    {/* Datos Empresa */}
                    <div style={{ fontSize: '0.8rem', color: '#334155', lineHeight: 1.5 }}>
                        <h2 style={{ color: '#1e293b', fontSize: '1.5rem', margin: '0 0 0.5rem 0', fontWeight: 700 }}>EcoSilence</h2>
                        <p style={{ margin: 0 }}>Pintor Laureano Guevara 60</p>
                        <p style={{ margin: 0 }}>La Reina, Santiago, Chile</p>
                        <p style={{ margin: 0 }}>77.510.784-7</p>
                        <p style={{ margin: 0 }}>info@ecosilence.cl | +569 5379 9875</p>
                    </div>
                 </div>
                 {/* Datos Cotizacion */}
                 <div style={{ textAlign: 'right' }}>
                    <div className="print-doc-id-box" style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Documento</p>
                        <p style={{ margin: '0.2rem 0', fontSize: '1.2rem', fontWeight: 700, color: '#1e293b' }}>Cotización #{servicio.idServicio}</p>
                        <div style={{ height: '1px', background: '#e2e8f0', margin: '0.5rem 0' }}></div>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#475569' }}><strong>Fecha:</strong> {new Date().toLocaleDateString('es-CL')}</p>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#475569' }}><strong>Vence:</strong> {new Date(new Date().getTime() + 15*24*60*60*1000).toLocaleDateString('es-CL')}</p>
                    </div>
                 </div>
              </div>

              {/* Info Cliente & Evento */}
              <div className="print-info-box" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '1rem', padding: '1.5rem', background: '#f8fafc', borderRadius: '8px', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                 <div>
                    <h4 style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', margin: '0 0 0.8rem 0', letterSpacing: '0.05em' }}>Cliente / Empresa</h4>
                    <p style={{ margin: '0 0 0.3rem 0', fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>{cliente.empresa || `${cliente.nombre} ${cliente.apellido}`}</p>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#334155' }}>{cliente.nombre} {cliente.apellido}</p>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#334155' }}>{cliente.correo}</p>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#334155' }}>{cliente.telefono}</p>
                 </div>
                 <div>
                    <h4 style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', margin: '0 0 0.8rem 0', letterSpacing: '0.05em' }}>Detalles del Evento</h4>
                    <p style={{ margin: '0 0 0.3rem 0', fontSize: '0.85rem', color: '#334155' }}><strong>Dirección:</strong> {servicio.direccionEvento}</p>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#334155' }}><strong>Fecha Evento:</strong> {servicio.fechaInicio.replace('T', ' ')}</p>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#334155' }}><strong>Moneda:</strong> {servicio.moneda || 'CLP'}</p>
                 </div>
              </div>

              {/* Tabla de Articulos */}
              <div style={{ marginTop: '1rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <tr>
                      <th style={{ padding: '1.2rem 1rem', textAlign: 'left', fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', textTransform: 'uppercase' }}>Equipo / Servicio</th>
                      <th style={{ padding: '1.2rem 1rem', textAlign: 'center', fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', textTransform: 'uppercase', width: '70px' }}>Cant.</th>
                      <th style={{ padding: '1.2rem 1rem', textAlign: 'center', fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', textTransform: 'uppercase', width: '70px' }}>Días</th>
                      <th style={{ padding: '1.2rem 1rem', textAlign: 'right', fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', textTransform: 'uppercase', width: '140px' }}>P. Unitario</th>
                      <th style={{ padding: '1.2rem 1rem', textAlign: 'right', fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', textTransform: 'uppercase', width: '140px' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemsCotizacion.map((item, idx) => (
                      <tr key={item.idCotizacion} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '2.5rem 1rem' }}>
                           <p style={{ margin: 0, fontWeight: 500, color: '#1e293b', fontSize: '1rem' }}>{item.descripcion}</p>
                        </td>
                        <td style={{ padding: '2.5rem 1rem', textAlign: 'center', color: '#475569', fontSize: '1rem', width: '70px' }}>{item.cantidad}</td>
                        <td style={{ padding: '2.5rem 1rem', textAlign: 'center', color: '#475569', fontSize: '1rem', width: '70px' }}>{item.dias}</td>
                        <td style={{ padding: '2.5rem 1rem', textAlign: 'right', color: '#475569', fontSize: '1rem', width: '140px' }}>{formatCurrency(item.precioUnitario)}</td>
                        <td style={{ padding: '2.5rem 1rem', textAlign: 'right', fontWeight: 700, color: '#1e293b', fontSize: '1rem', width: '140px' }}>{formatCurrency(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot style={{ borderTop: '2px solid #e2e8f0' }}>
                    <tr>
                      <td colSpan="4" style={{ padding: '1.5rem 1rem 0.5rem 1rem', textAlign: 'right', color: '#64748b', fontSize: '1rem' }}>Subtotal</td>
                      <td style={{ padding: '1.5rem 1rem 0.5rem 1rem', textAlign: 'right', color: '#334155', fontSize: '1rem', fontWeight: 600 }}>{formatCurrency(totales.subtotalBruto)}</td>
                    </tr>
                    {totales.descuentoPorcentaje > 0 && (
                      <tr>
                        <td colSpan="4" style={{ padding: '0.5rem 1rem', textAlign: 'right', color: '#ef4444', fontSize: '1rem' }}>Descuento ({totales.descuentoPorcentaje}%)</td>
                        <td style={{ padding: '0.5rem 1rem', textAlign: 'right', color: '#ef4444', fontSize: '1rem', fontWeight: 600 }}>- {formatCurrency(totales.descuentoMonto)}</td>
                      </tr>
                    )}
                    <tr>
                      <td colSpan="4" style={{ padding: '0.5rem 1rem', textAlign: 'right', color: '#64748b', fontSize: '1rem' }}>IVA (19%)</td>
                      <td style={{ padding: '0.5rem 1rem', textAlign: 'right', color: '#334155', fontSize: '1rem', fontWeight: 600 }}>{formatCurrency(totales.iva)}</td>
                    </tr>
                    <tr>
                      <td colSpan="4" style={{ padding: '1.5rem 1rem', textAlign: 'right', color: '#1e293b', fontSize: '1.1rem', fontWeight: 700 }}>Total General</td>
                      <td style={{ padding: '1.5rem 1rem', textAlign: 'right', color: '#6366f1', fontSize: '1.4rem', fontWeight: 800 }}>{formatCurrency(totales.total)}</td>
                    </tr>
                  </tfoot>


                </table>
              </div>

              {/* Sección de Resumen (Sin los totales que ahora están en la tabla) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
                <div style={{ width: '60%', fontSize: '0.8rem', color: '#475569', lineHeight: 1.6 }}>
                    <div style={{ padding: '1rem', borderLeft: '3px solid #6366f1', background: '#f8fafc' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: '#1e293b' }}>Notas Importantes</h4>
                        <p style={{ margin: 0 }}>Esta cotización es válida por 15 días a partir de la fecha de emisión. Los precios incluyen soporte técnico básico durante el evento.</p>
                    </div>
                </div>
              </div>

              {/* Footer: Datos de Pago y Términos */}
              <div style={{ marginTop: 'auto', paddingTop: '2rem', borderTop: '1px solid #e2e8f0' }}>
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', fontSize: '0.75rem', color: '#64748b' }}>
                    <div>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Datos para Transferencia</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '0.3rem' }}>
                            <strong>Titular:</strong> <span>EcoSilence SPA</span>
                            <strong>RUT:</strong> <span>77.510.784-7</span>
                            <strong>Banco:</strong> <span>Banco de Chile</span>
                            <strong>Cuenta:</strong> <span>Cuenta Corriente 00-023-709973-10</span>
                            <strong>Email:</strong> <span>info@ecosilence.cl</span>
                        </div>
                    </div>
                    <div>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Términos y Condiciones</h4>
                        <ul style={{ paddingLeft: '1.2rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                           <li>Reserva: 50% de anticipo al confirmar, saldo contra entrega.</li>
                           <li>Cancelación: Cargo del 20% si se cancela con menos de 48 hrs.</li>
                           <li>Reposición: Audífono $60.000 / Transmisor $250.000 (en caso de pérdida).</li>
                           <li>Arriendo base: 24 horas por evento.</li>
                        </ul>
                    </div>
                 </div>
                 <div style={{ textAlign: 'center', marginTop: '2rem', color: '#94a3b8', fontSize: '0.7rem' }}>
                    <p>EcoSilence - Soluciones Audiovisuales Profesionales</p>
                 </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CotizacionesView;
