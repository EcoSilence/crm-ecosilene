import React, { useMemo, useState } from 'react';
import { useAppStore } from '../context/AppDataContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { DollarSign, Briefcase, MapPin, Calendar, Clock, Filter } from 'lucide-react';

const Dashboard = () => {
  const { servicios, cotizaciones } = useAppStore();
  const [selectedMonth, setSelectedMonth] = useState('Todos');

  const availableMonths = useMemo(() => {
    try {
      const months = new Set();
      (servicios || []).forEach(s => {
        if(s && s.fechaInicio) months.add(String(s.fechaInicio).substring(0, 7));
      });
      return Array.from(months).sort();
    } catch (e) { return []; }
  }, [servicios]);

  const filteredServicios = useMemo(() => {
    try {
      if (selectedMonth === 'Todos') return servicios || [];
      return (servicios || []).filter(s => s && s.fechaInicio && String(s.fechaInicio).startsWith(selectedMonth));
    } catch (e) { return []; }
  }, [servicios, selectedMonth]);

  const kpis = useMemo(() => {
    let cotizadoCount = 0;
    let cotizadoMonto = 0;
    let aprobadoCount = 0;
    let aprobadoMonto = 0;
    let porCobrarCount = 0;
    let porCobrarMonto = 0;
    let pagadoCount = 0;
    let pagadoMonto = 0;

    const getFinalTotal = (s) => {
       const subtotalBruto = (cotizaciones || []).filter(c => c.servicioId === s.idServicio).reduce((acc, curr) => acc + (curr.subtotal || 0), 0);
       const descuentoMonto = subtotalBruto * ((s.descuento || 0) / 100);
       const neto = subtotalBruto - descuentoMonto;
       return neto * 1.19; // IVA
    };

    filteredServicios.forEach(s => {
      const finalTotal = getFinalTotal(s);
      
      if (s.etapa === 'Cotizado') {
        cotizadoCount++;
        cotizadoMonto += finalTotal;
      } else if (s.etapa === 'Aprobado') {
        aprobadoCount++;
        aprobadoMonto += finalTotal;
      } else if (s.etapa === 'Por Cobrar') {
        porCobrarCount++;
        porCobrarMonto += finalTotal;
      } else if (s.etapa === 'Pagado') {
        pagadoCount++;
        pagadoMonto += finalTotal;
      }
    });

    return { 
      cotizadoCount, cotizadoMonto, 
      aprobadoCount, aprobadoMonto, 
      porCobrarCount, porCobrarMonto, 
      pagadoCount, pagadoMonto 
    };
  }, [filteredServicios, cotizaciones]);

  const chartData = useMemo(() => {
    const counts = { Cotizado: 0, Aprobado: 0, 'Por Cobrar': 0, Pagado: 0 };
    filteredServicios.forEach(s => {
      if (counts[s.etapa] !== undefined) counts[s.etapa]++;
    });
    return [
      { name: 'Cotizado', pv: counts['Cotizado'], color: 'var(--color-banana)' },
      { name: 'Aprobado', pv: counts['Aprobado'], color: 'var(--color-berry)' },
      { name: 'Por Cobrar', pv: counts['Por Cobrar'], color: 'var(--color-tomato)' },
      { name: 'Pagado', pv: counts['Pagado'], color: 'var(--color-basil)' },
    ];
  }, [filteredServicios]);

  const formatCurrency = (val) => {
    try {
      return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val || 0);
    } catch { return '$0'; }
  };
  
  const monthNames = { '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril', '05': 'Mayo', '06': 'Junio', '07': 'Julio', '08': 'Agosto', '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre' };
  const formatMonth = (yyyy_mm) => {
    if(!yyyy_mm) return '';
    try {
      const [y, m] = String(yyyy_mm).split('-'); 
      return `${monthNames[m] || m} ${y}`;
    } catch { return String(yyyy_mm); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ marginBottom: '0.5rem' }}>Panel de Control {selectedMonth !== 'Todos' ? `- ${formatMonth(selectedMonth)}` : ''}</h1>
          <p style={{ color: 'var(--text-muted)' }}>Resumen de métricas de facturación y servicios del periodo.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-panel)', padding: '0.6rem 1rem', borderRadius: 'var(--radius-md)' }}>
           <Filter size={18} color="var(--text-muted)" />
           <select 
             className="input-control" 
             style={{ border: 'none', background: 'transparent', padding: 0, margin: 0, outline: 'none', fontSize: '1rem', fontWeight: 600 }}
             value={selectedMonth} 
             onChange={e => setSelectedMonth(e.target.value)}
           >
             <option value="Todos">Facturación Total (Histórico)</option>
             {availableMonths.map(m => <option key={m} value={m}>{formatMonth(m)}</option>)}
           </select>
        </div>
      </div>

      <div className="responsive-grid-cards">
        
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', padding: '1.2rem' }}>
          <div style={{ background: 'var(--color-banana-bg)', padding: '0.8rem', borderRadius: '50%', color: 'var(--color-banana)' }}>
            <Briefcase size={24} />
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.2rem' }}>Cotizaciones Activas ({kpis.cotizadoCount})</p>
            <h2 style={{ fontSize: '1.4rem' }}>{formatCurrency(kpis.cotizadoMonto)}</h2>
          </div>
        </div>

        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', padding: '1.2rem' }}>
          <div style={{ background: 'var(--color-berry-bg)', padding: '0.8rem', borderRadius: '50%', color: 'var(--color-berry)' }}>
            <Calendar size={24} />
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.2rem' }}>Trabajos Aprobados ({kpis.aprobadoCount})</p>
            <h2 style={{ fontSize: '1.4rem' }}>{formatCurrency(kpis.aprobadoMonto)}</h2>
          </div>
        </div>

        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', padding: '1.2rem' }}>
          <div style={{ background: 'var(--color-tomato-bg)', padding: '0.8rem', borderRadius: '50%', color: 'var(--color-tomato)' }}>
            <Clock size={24} />
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.2rem' }}>Trabajos Por Cobrar ({kpis.porCobrarCount})</p>
            <h2 style={{ fontSize: '1.4rem' }}>{formatCurrency(kpis.porCobrarMonto)}</h2>
          </div>
        </div>

        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', padding: '1.2rem' }}>
          <div style={{ background: 'var(--color-basil-bg)', padding: '0.8rem', borderRadius: '50%', color: 'var(--color-basil)' }}>
            <DollarSign size={24} />
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.2rem' }}>Pagados Completados ({kpis.pagadoCount})</p>
            <h2 style={{ fontSize: '1.4rem' }}>{formatCurrency(kpis.pagadoMonto)}</h2>
          </div>
        </div>

      </div>

      <div className="responsive-grid-2">
        <div className="glass-card">
          <h3 style={{ marginBottom: '1.5rem' }}>Distribución de Etapas</h3>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip cursor={{ fill: 'var(--bg-panel-hover)' }} contentStyle={{ background: 'var(--bg-dark)', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
                <Bar dataKey="pv" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Eventos de este Periodo</h3>
          
          <div style={{ flex: 1, borderRadius: 'var(--radius-md)', backgroundColor: '#1a1c23', position: 'relative', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
            <div style={{ position: 'absolute', inset: 0, opacity: 0.1, backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
            
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', gap: '0.8rem', padding: '1rem', overflowY: 'auto' }}>
              {filteredServicios.map(s => {
                const fechaStr = String(s.fechaInicio || '');
                const dDate = fechaStr.includes('T') ? fechaStr.split('T')[0] : fechaStr;
                const dTime = fechaStr.includes('T') ? fechaStr.split('T')[1] : '';

                return (
                  <div key={s.idServicio} className="glass-panel" style={{ padding: '1rem', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                    <div style={{ padding: '0.6rem', borderRadius: '50%', background: 'var(--accent-gradient)', color: '#fff' }}>
                        <MapPin size={18} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: '0 0 0.3rem 0', fontSize: '0.95rem' }}>{s.direccionEvento}</h4>
                      <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Calendar size={14}/> {dDate}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Clock size={14}/> {dTime}</span>
                      </div>
                    </div>
                    <div>
                        <span className={`badge badge-${(s.etapa||'').toLowerCase().replace(' ', '-')}`}>{s.etapa}</span>
                    </div>
                  </div>
                )
              })}
              {filteredServicios.length === 0 && (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '2rem' }}>Selecciona otro periodo.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
