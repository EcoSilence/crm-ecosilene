import React, { useMemo } from 'react';
import { useAppStore } from '../context/AppDataContext';
import { ArrowLeft, MapPin, CalendarDays, CheckCircle } from 'lucide-react';

const ServiciosListView = () => {
  const { servicios, clientes, cotizaciones, navigate, viewParams, formatDateDDMMYYYY } = useAppStore();
  const stage = viewParams?.stage || 'Cotizado';

  // Sort services by date descending (newest first)
  const filteredServicios = useMemo(() => {
    return (servicios || [])
      .filter(s => s.etapa === stage)
      .sort((a, b) => {
        if (!a.fechaInicio) return 1;
        if (!b.fechaInicio) return -1;
        return a.fechaInicio > b.fechaInicio ? -1 : 1;
      });
  }, [servicios, stage]);

  const getClientName = (id) => {
    const c = clientes?.find(x => x.idCliente === id);
    return c ? `${c.nombre} ${c.apellido}` : 'Desconocido';
  };

  const getServiceTotals = (idServicio, descuentoData = 0) => {
    const items = (cotizaciones || []).filter(c => c.servicioId === idServicio);
    const subtotalBruto = items.reduce((acc, c) => acc + c.subtotal, 0);
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button className="btn btn-ghost" onClick={() => navigate('dashboard')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ArrowLeft size={18} /> Volver al Dashboard
        </button>
      </div>

      <div>
        <h1 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          Trabajos en etapa: <span style={{ color: getStageColor(stage) }}>{stage}</span>
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>Lista de todos los servicios clasificados como {stage}. Hay {filteredServicios.length} resultados.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {filteredServicios.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }} className="glass-panel">
            No hay servicios en esta etapa.
          </div>
        ) : (
          filteredServicios.map(s => (
            <div key={s.idServicio} style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
              padding: '1.2rem', background: 'var(--bg-dark)', borderRadius: 'var(--radius-sm)',
              border: `1px solid ${getStageColor(stage)}33`, borderLeft: `4px solid ${getStageColor(stage)}`, gap: '1rem', flexWrap: 'wrap',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
              <div style={{ flex: '1 1 250px', minWidth: '200px' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {s.idServicio} <span className="text-muted" style={{ fontWeight: 400, fontSize: '0.9rem' }}>— {getClientName(s.clienteId)}</span>
                </h3>
                <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem', flexWrap: 'wrap', marginBottom: '0.8rem' }}>
                   <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><MapPin size={14}/> {s.direccionEvento || 'Sin dirección'}</span>
                   <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><CalendarDays size={14}/> Inicio: {s.fechaInicio ? formatDateDDMMYYYY(s.fechaInicio) : 'Por definir'}</span>
                </div>
                {(() => {
                   const { neto, total } = getServiceTotals(s.idServicio, s.descuento || 0);
                   const currency = s.moneda || 'CLP';
                   return (
                     <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', flexWrap: 'wrap' }}>
                       <span style={{ background: 'rgba(255,255,255,0.05)', padding: '0.3rem 0.6rem', borderRadius: '4px' }}>Neto: <strong style={{ color: 'var(--text-main)' }}>{formatCurrency(neto, currency)}</strong></span>
                       <span style={{ background: 'rgba(255,255,255,0.05)', padding: '0.3rem 0.6rem', borderRadius: '4px' }}>Total c/IVA: <strong style={{ color: 'var(--accent-primary)' }}>{formatCurrency(total, currency)}</strong></span>
                     </div>
                   );
                })()}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                <button 
                   className="btn btn-primary" 
                   style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }} 
                   onClick={() => navigate('cotizaciones', { servicioId: s.idServicio })}
                >
                  <CheckCircle size={16}/> Ver Detalles / Cotizar
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ServiciosListView;
