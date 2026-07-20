import React, { useState, useMemo } from 'react';
import { useAppStore } from '../context/AppDataContext';
import { useToast } from '../context/ToastContext';
import { 
  Search, Filter, Users, Mail, Phone, MapPin, Building, Calendar, 
  Sparkles, Check, X, RefreshCw, Download, Plus, Edit2, Trash2, ArrowRight
} from 'lucide-react';
import * as XLSX from 'xlsx';

const ClientSearchModule = ({ onBack }) => {
  const { 
    clientes, servicios, cotizaciones, 
    addCliente, editCliente, removeCliente, navigate 
  } = useAppStore();
  const { addToast } = useToast();

  // 1. Estados de Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEventTypes, setSelectedEventTypes] = useState([]);
  const [selectedCapacities, setSelectedCapacities] = useState([]);
  const [selectedHealthStatus, setSelectedHealthStatus] = useState([]);
  const [selectedComunas, setSelectedComunas] = useState([]);
  const [selectedLtvRanges, setSelectedLtvRanges] = useState([]);
  const [dateRangePreset, setDateRangePreset] = useState('todos'); // 'todos' | 'hoy' | 'semana' | 'mes' | 'trimestre' | 'ano' | 'personalizado'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // 2. Control de Paneles / Formularios
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    id: '', nombre: '', apellido: '', correo: '', telefono: '', direccionEmpresa: '', comuna: '', pais: 'Chile', empresa: '', cargo: '', tipoEvento: 'Conferencia', fechaIngreso: ''
  });

  // 3. Opciones de Filtros
  const eventTypesOptions = [
    { value: 'Cine al aire libre', label: '🎥 Cine al Aire Libre / Outdoor Cinema' },
    { value: 'Fiesta', label: '🎧 Fiestas / Música (Audífonos Multi-canal)' },
    { value: 'Conferencia', label: '🎙️ Conferencias / Charlas / Traducción' },
    { value: 'Yoga', label: '🧘 Clases de Yoga / Wellness / Meditación' },
    { value: 'Activación de Marca', label: '💼 Activaciones de Marca / B2B' }
  ];

  const capacityOptions = [
    { value: 'pequeno', label: 'Pequeño (1 - 50 audífonos)' },
    { value: 'mediano', label: 'Mediano (51 - 200 audífonos)' },
    { value: 'grande', label: 'Grande (201 - 500+ audífonos)' }
  ];

  const healthOptions = [
    { value: 'activo', label: '🟢 Activo (≤ 90 días)' },
    { value: 'enfriado', label: '🟡 Enfriado (3 - 6 meses)' },
    { value: 'prospecto', label: '🔵 Prospecto / Nuevo (Sin eventos cerrados)' }
  ];

  const ltvOptions = [
    { value: 'bajo', label: 'Bajo LTV (< $500.000)' },
    { value: 'medio', label: 'Medio LTV ($500k - $2M)' },
    { value: 'alto', label: 'Alto LTV (> $2.000.000)' }
  ];

  // Listado de comunas únicas
  const comunasOptions = useMemo(() => {
    const list = clientes
      .map(c => c.comuna ? c.comuna.trim() : '')
      .filter(Boolean);
    return Array.from(new Set(list)).sort();
  }, [clientes]);

  // 4. Motor de Análisis y Cálculo de Segmentación en Tiempo Real
  const clientsWithMetrics = useMemo(() => {
    return clientes.map(c => {
      // a. Calcular Fecha Ingreso Fallback
      let fechaIngresoDate = null;
      if (c.fechaIngreso) {
        fechaIngresoDate = new Date(c.fechaIngreso);
      } else {
        // Fallback: buscar el primer servicio
        const clientServs = servicios.filter(s => s.clienteId === c.id);
        if (clientServs.length > 0) {
          const dates = clientServs
            .map(s => s.fechaInicio ? new Date(s.fechaInicio).getTime() : null)
            .filter(Boolean);
          if (dates.length > 0) {
            fechaIngresoDate = new Date(Math.min(...dates));
          }
        }
      }
      if (!fechaIngresoDate) {
        fechaIngresoDate = new Date('2026-01-01'); // fallback por defecto
      }
      
      const fechaIngresoStr = fechaIngresoDate.toISOString().split('T')[0];

      // b. Calcular LTV (Suma de cotizaciones aprobadas/ejecutadas/pagadas)
      const clientClosedServs = servicios.filter(s => 
        s.clienteId === c.id && 
        ['Aprobado', 'Ejecutado', 'Pagado'].includes(s.etapa)
      );

      let ltvTotal = 0;
      clientClosedServs.forEach(s => {
        const cots = cotizaciones.filter(q => q.servicioId === s.idServicio);
        let subtotal = 0;
        cots.forEach(q => {
          subtotal += q.cantidad * q.dias * q.precioUnitario;
        });
        const total = subtotal * (1 - (s.descuento || 0) / 100);
        ltvTotal += total;
      });

      // c. Calcular promedio de audífonos contratados
      const audifonosCots = cotizaciones.filter(q => {
        const s = servicios.find(srv => srv.idServicio === q.servicioId);
        if (!s || s.clienteId !== c.id) return false;
        // Identificar audífonos en cotizaciones
        return q.descripcion && (q.descripcion.toLowerCase().includes('audífono') || q.descripcion.toLowerCase().includes('audifono'));
      });

      let promedioAudifonos = 0;
      if (audifonosCots.length > 0) {
        const sum = audifonosCots.reduce((acc, curr) => acc + curr.cantidad, 0);
        promedioAudifonos = Math.round(sum / audifonosCots.length);
      }

      // d. Calcular estado de recalentamiento (Salud/Recencia)
      const clientAllServs = servicios.filter(s => s.clienteId === c.id);
      let estadoSalud = 'prospecto';
      let fechaUltimoEvento = null;

      if (clientAllServs.length > 0) {
        const dates = clientAllServs
          .map(s => s.fechaInicio ? new Date(s.fechaInicio).getTime() : null)
          .filter(Boolean);
        
        if (dates.length > 0) {
          const maxTime = Math.max(...dates);
          fechaUltimoEvento = new Date(maxTime);
          
          const diffDays = Math.ceil((new Date().getTime() - maxTime) / (1000 * 60 * 60 * 24));
          
          if (clientClosedServs.length > 0) {
            if (diffDays <= 90) {
              estadoSalud = 'activo';
            } else if (diffDays <= 180) {
              estadoSalud = 'enfriado';
            } else {
              estadoSalud = 'frio'; // fuera de rango (frío)
            }
          } else {
            estadoSalud = 'prospecto';
          }
        }
      }

      return {
        ...c,
        fechaIngresoStr,
        fechaIngresoDate,
        ltv: ltvTotal,
        promedioAudifonos,
        estadoSalud,
        fechaUltimoEvento
      };
    });
  }, [clientes, servicios, cotizaciones]);

  // 5. Aplicar Filtros Dinámicos
  const filteredClients = useMemo(() => {
    return clientsWithMetrics.filter(c => {
      // a. Búsqueda por texto libre
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesText = 
          c.nombre?.toLowerCase().includes(query) ||
          c.apellido?.toLowerCase().includes(query) ||
          c.empresa?.toLowerCase().includes(query) ||
          c.correo?.toLowerCase().includes(query) ||
          c.telefono?.toLowerCase().includes(query) ||
          c.comuna?.toLowerCase().includes(query);
        if (!matchesText) return false;
      }

      // b. Filtro Tipo de Evento Frecuente
      if (selectedEventTypes.length > 0) {
        const matchesEvent = selectedEventTypes.some(type => {
          // mapeo difuso
          if (!c.tipoEvento) return false;
          const userVal = c.tipoEvento.toLowerCase();
          if (type === 'Fiesta' && (userVal.includes('fiesta') || userVal.includes('música') || userVal.includes('music'))) return true;
          if (type === 'Cine al aire libre' && (userVal.includes('cine') || userVal.includes('outdoor'))) return true;
          if (type === 'Conferencia' && (userVal.includes('conferencia') || userVal.includes('charla') || userVal.includes('traducción') || userVal.includes('simultanea'))) return true;
          if (type === 'Yoga' && (userVal.includes('yoga') || userVal.includes('wellness') || userVal.includes('meditaci'))) return true;
          if (type === 'Activación de Marca' && (userVal.includes('activac') || userVal.includes('marca') || userVal.includes('b2b'))) return true;
          return userVal.includes(type.toLowerCase());
        });
        if (!matchesEvent) return false;
      }

      // c. Filtro Capacidad de Audífonos
      if (selectedCapacities.length > 0) {
        const matchesCapacity = selectedCapacities.some(cap => {
          if (cap === 'pequeno') return c.promedioAudifonos <= 50;
          if (cap === 'mediano') return c.promedioAudifonos > 50 && c.promedioAudifonos <= 200;
          if (cap === 'grande') return c.promedioAudifonos > 200;
          return false;
        });
        if (!matchesCapacity) return false;
      }

      // d. Filtro Estado de Recalentamiento / Salud
      if (selectedHealthStatus.length > 0) {
        const matchesHealth = selectedHealthStatus.some(h => {
          if (h === 'activo') return c.estadoSalud === 'activo';
          if (h === 'enfriado') return c.estadoSalud === 'enfriado' || c.estadoSalud === 'frio';
          if (h === 'prospecto') return c.estadoSalud === 'prospecto';
          return false;
        });
        if (!matchesHealth) return false;
      }

      // e. Filtro Comuna
      if (selectedComunas.length > 0) {
        if (!c.comuna || !selectedComunas.includes(c.comuna.trim())) return false;
      }

      // f. Filtro Rango LTV
      if (selectedLtvRanges.length > 0) {
        const matchesLtv = selectedLtvRanges.some(r => {
          if (r === 'bajo') return c.ltv < 500000;
          if (r === 'medio') return c.ltv >= 500000 && c.ltv <= 2000000;
          if (r === 'alto') return c.ltv > 2000000;
          return false;
        });
        if (!matchesLtv) return false;
      }

      // g. Rango de Fechas de Ingreso
      if (dateRangePreset !== 'todos') {
        const date = c.fechaIngresoDate;
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        if (dateRangePreset === 'hoy') {
          if (date < startOfToday) return false;
        } else if (dateRangePreset === 'semana') {
          const startOfWeek = new Date(startOfToday.getTime() - now.getDay() * 24 * 60 * 60 * 1000);
          if (date < startOfWeek) return false;
        } else if (dateRangePreset === 'mes') {
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          if (date < startOfMonth) return false;
        } else if (dateRangePreset === 'trimestre') {
          const ninetyDaysAgo = new Date(startOfToday.getTime() - 90 * 24 * 60 * 60 * 1000);
          if (date < ninetyDaysAgo) return false;
        } else if (dateRangePreset === 'ano') {
          const startOfYear = new Date(now.getFullYear(), 0, 1);
          if (date < startOfYear) return false;
        } else if (dateRangePreset === 'personalizado') {
          if (customStartDate && date < new Date(customStartDate)) return false;
          if (customEndDate) {
            const endLimit = new Date(customEndDate);
            endLimit.setHours(23, 59, 59, 999);
            if (date > endLimit) return false;
          }
        }
      }

      return true;
    });
  }, [clientsWithMetrics, searchQuery, selectedEventTypes, selectedCapacities, selectedHealthStatus, selectedComunas, selectedLtvRanges, dateRangePreset, customStartDate, customEndDate]);

  // 6. Métricas Consolidadas del Segmento
  const metrics = useMemo(() => {
    const total = filteredClients.length;
    const ltvSum = filteredClients.reduce((acc, curr) => acc + curr.ltv, 0);
    const ltvAverage = total > 0 ? ltvSum / total : 0;
    const totalAudifonos = filteredClients.reduce((acc, curr) => acc + curr.promedioAudifonos, 0);

    return {
      total,
      ltvSum,
      ltvAverage,
      totalAudifonos
    };
  }, [filteredClients]);

  // 7. Acciones
  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedEventTypes([]);
    setSelectedCapacities([]);
    setSelectedHealthStatus([]);
    setSelectedComunas([]);
    setSelectedLtvRanges([]);
    setDateRangePreset('todos');
    setCustomStartDate('');
    setCustomEndDate('');
    addToast('Filtros restablecidos', 'info');
  };

  const handleExportMailCampaign = () => {
    const emails = filteredClients.map(c => c.correo).filter(Boolean);
    if (emails.length === 0) {
      return addToast('No hay destinatarios con correos válidos en la selección', 'warning');
    }
    
    // Guardar en viewParams y navegar a MassEmailView
    navigate('envio_masivo', { preselectedEmails: emails });
    addToast(`Cargados ${emails.length} destinatarios a la campaña de correo.`, 'success');
  };

  const handleExportExcel = () => {
    if (filteredClients.length === 0) return addToast('No hay clientes en el segmento', 'warning');

    const exportData = filteredClients.map(c => ({
      ID: c.id,
      Nombre: c.nombre,
      Apellido: c.apellido,
      Correo: c.correo,
      Teléfono: c.telefono,
      Empresa: c.empresa,
      Cargo: c.cargo,
      'Tipo de Evento': c.tipoEvento,
      Dirección: c.direccionEmpresa,
      Comuna: c.comuna,
      País: c.pais,
      'Fecha Ingreso': c.fechaIngresoStr,
      LTV: c.ltv,
      'Promedio Audífonos': c.promedioAudifonos,
      'Estado Salud': c.estadoSalud.toUpperCase()
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Segmento Clientes");
    XLSX.writeFile(wb, "Segmento_Clientes_EcoSilence.xlsx");
    addToast('Excel exportado correctamente.', 'success');
  };

  const toggleFilter = (list, setList, val) => {
    if (list.includes(val)) {
      setList(list.filter(item => item !== val));
    } else {
      setList([...list, val]);
    }
  };

  const handleOpenEdit = (c) => {
    setEditMode(true);
    setFormData({
      id: c.id,
      nombre: c.nombre || '',
      apellido: c.apellido || '',
      correo: c.correo || '',
      telefono: c.telefono || '',
      direccionEmpresa: c.direccionEmpresa || '',
      comuna: c.comuna || '',
      pais: c.pais || 'Chile',
      empresa: c.empresa || '',
      cargo: c.cargo || '',
      tipoEvento: c.tipoEvento || 'Conferencia',
      fechaIngreso: c.fechaIngresoStr || ''
    });
    setIsModalOpen(true);
  };

  const handleOpenCreate = () => {
    setEditMode(false);
    const today = new Date().toISOString().split('T')[0];
    setFormData({
      id: '',
      nombre: '',
      apellido: '',
      correo: '',
      telefono: '',
      direccionEmpresa: '',
      comuna: '',
      pais: 'Chile',
      empresa: '',
      cargo: '',
      tipoEvento: 'Conferencia',
      fechaIngreso: today
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (editMode) {
      await editCliente(formData.id, formData);
    } else {
      await addCliente(formData);
    }
    setIsModalOpen(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Volver al Directorio */}
      <div>
        <button 
          className="btn btn-ghost"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', padding: '6px 12px', color: 'var(--text-muted)' }}
          onClick={onBack}
        >
          ← Volver al Directorio de Clientes
        </button>
      </div>

      {/* 1. Header principal */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.2rem' }}>
            <Sparkles size={20} color="var(--accent-primary)" />
            <h1 style={{ margin: 0 }}>Segmentación Avanzada de Clientes</h1>
          </div>
          <p style={{ color: 'var(--text-muted)' }}>Filtra y agrupa tu base de clientes según LTV, eventos, audífonos y recencia.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button 
            className="btn btn-ghost" 
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={handleClearFilters}
          >
            <RefreshCw size={14} /> Limpiar Filtros
          </button>
          <button 
            className="btn btn-secondary" 
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={handleExportExcel}
          >
            <Download size={14} /> Exportar Excel
          </button>
          <button 
            className="btn btn-primary" 
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={handleOpenCreate}
          >
            <Plus size={16} /> Registrar Cliente
          </button>
        </div>
      </div>

      {/* 2. Tarjetas de Métricas de Segmentación */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        
        <div className="glass-card" style={{ padding: '1.2rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Clientes Seleccionados</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, margin: '5px 0', color: 'var(--accent-primary)' }}>
            {metrics.total} <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-muted)' }}>de {clientes.length}</span>
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Segmento activo para campaña</span>
        </div>

        <div className="glass-card" style={{ padding: '1.2rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>LTV Total del Segmento</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, margin: '5px 0', color: '#10b981' }}>
            ${metrics.ltvSum.toLocaleString('es-CL')}
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>LTV Promedio: ${Math.round(metrics.ltvAverage).toLocaleString('es-CL')}</span>
        </div>

        <div className="glass-card" style={{ padding: '1.2rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Capacidad de Audífonos</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, margin: '5px 0', color: '#6366f1' }}>
            {metrics.totalAudifonos} <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-muted)' }}>unidades</span>
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Total promedio contratado</span>
        </div>

        <div className="glass-card" style={{ padding: '1.2rem', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-color)', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <button 
            onClick={handleExportMailCampaign}
            disabled={filteredClients.length === 0}
            className="btn btn-primary animate-pulse"
            style={{ 
              width: '100%', 
              padding: '12px', 
              fontSize: '0.85rem', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '8px',
              background: 'var(--accent-gradient)',
              border: 'none',
              animationDuration: '3s'
            }}
          >
            <Mail size={16} /> Exportar a Campaña de Correo
          </button>
        </div>

      </div>

      {/* 3. Panel de Filtros */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
        
        {/* Fila 1: Texto Libre y Selector Rango de Fecha de Ingreso */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          
          <div className="input-group" style={{ margin: 0, position: 'relative' }}>
            <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Search size={12} /> Búsqueda por Texto Libre</label>
            <div style={{ position: 'relative', width: '100%' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                className="input-control" 
                placeholder="Nombre, empresa, email, teléfono, comuna..." 
                style={{ paddingLeft: '2.2rem' }}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="input-group" style={{ margin: 0 }}>
            <label className="input-label">Fecha de Ingreso de Clientes</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <select 
                className="input-control" 
                style={{ flex: 1 }}
                value={dateRangePreset}
                onChange={e => setDateRangePreset(e.target.value)}
              >
                <option value="todos">Cualquier fecha</option>
                <option value="hoy">Hoy</option>
                <option value="semana">Esta semana</option>
                <option value="mes">Este mes</option>
                <option value="trimestre">Último trimestre</option>
                <option value="ano">Año actual (2026)</option>
                <option value="personalizado">Rango personalizado...</option>
              </select>
              
              {dateRangePreset === 'personalizado' && (
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  <input type="date" className="input-control" style={{ padding: '4px 8px', fontSize: '0.78rem' }} value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>al</span>
                  <input type="date" className="input-control" style={{ padding: '4px 8px', fontSize: '0.78rem' }} value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} />
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Fila 2: Filtros por Tipo de Evento Frecuente (Badges) */}
        <div>
          <label className="input-label" style={{ marginBottom: '0.4rem', display: 'block' }}>Tipo de Evento Frecuente / Preferido</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {eventTypesOptions.map(opt => {
              const active = selectedEventTypes.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  onClick={() => toggleFilter(selectedEventTypes, setSelectedEventTypes, opt.value)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    background: active ? 'rgba(37,99,235,0.2)' : 'rgba(255,255,255,0.02)',
                    border: active ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                    color: active ? '#fff' : 'var(--text-muted)',
                    transition: 'all 0.2s',
                    outline: 'none'
                  }}
                >
                  {opt.label} {active && ' ✓'}
                </button>
              );
            })}
          </div>
        </div>

        {/* Fila 3: Filtros Avanzados (Salud, Capacidad, Presupuesto y Comunas) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.2rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.2rem' }}>
          
          {/* Salud / Recencia */}
          <div>
            <label className="input-label" style={{ marginBottom: '0.4rem', display: 'block' }}>Salud del Cliente (Lead Scoring)</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {healthOptions.map(opt => (
                <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  <input 
                    type="checkbox"
                    checked={selectedHealthStatus.includes(opt.value)}
                    onChange={() => toggleFilter(selectedHealthStatus, setSelectedHealthStatus, opt.value)}
                    style={{ accentColor: 'var(--accent-primary)' }}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          {/* Capacidad de Audífonos */}
          <div>
            <label className="input-label" style={{ marginBottom: '0.4rem', display: 'block' }}>Promedio de Audífonos Contratados</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {capacityOptions.map(opt => (
                <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  <input 
                    type="checkbox"
                    checked={selectedCapacities.includes(opt.value)}
                    onChange={() => toggleFilter(selectedCapacities, setSelectedCapacities, opt.value)}
                    style={{ accentColor: 'var(--accent-primary)' }}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          {/* Rango de Presupuesto LTV */}
          <div>
            <label className="input-label" style={{ marginBottom: '0.4rem', display: 'block' }}>Valor Vitalicio (LTV)</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {ltvOptions.map(opt => (
                <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  <input 
                    type="checkbox"
                    checked={selectedLtvRanges.includes(opt.value)}
                    onChange={() => toggleFilter(selectedLtvRanges, setSelectedLtvRanges, opt.value)}
                    style={{ accentColor: 'var(--accent-primary)' }}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          {/* Segmentación Geográfica (Comuna) */}
          <div>
            <label className="input-label" style={{ marginBottom: '0.4rem', display: 'block' }}>Ubicación Geográfica (Comuna)</label>
            {comunasOptions.length > 0 ? (
              <div style={{ maxHeight: '100px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '6px', background: 'rgba(0,0,0,0.1)' }}>
                {comunasOptions.map(comuna => (
                  <label key={comuna} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', cursor: 'pointer', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    <input 
                      type="checkbox"
                      checked={selectedComunas.includes(comuna)}
                      onChange={() => toggleFilter(selectedComunas, setSelectedComunas, comuna)}
                      style={{ accentColor: 'var(--accent-primary)' }}
                    />
                    {comuna}
                  </label>
                ))}
              </div>
            ) : (
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Ninguna comuna ingresada en el CRM</span>
            )}
          </div>

        </div>

      </div>

      {/* 4. Tabla de Resultados */}
      <div className="glass-panel" style={{ padding: '1.2rem', overflowX: 'auto' }}>
        <div style={{ overflowX: 'auto', maxHeight: '50vh', position: 'relative' }}>
          <table className="sticky-header" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.82rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '0.8rem' }}>Empresa / Cliente</th>
                <th style={{ padding: '0.8rem' }}>Preferido / Audífonos</th>
                <th style={{ padding: '0.8rem' }}>Ingreso CRM</th>
                <th style={{ padding: '0.8rem' }}>Comportamiento LTV</th>
                <th style={{ padding: '0.8rem' }}>Salud Lead</th>
                <th style={{ padding: '0.8rem', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map(c => {
                let healthColor = 'rgba(255,255,255,0.05)';
                let healthText = 'Prospecto';
                let healthBorder = 'transparent';

                if (c.estadoSalud === 'activo') {
                  healthColor = 'rgba(16,185,129,0.1)';
                  healthText = '🟢 Activo';
                  healthBorder = 'rgba(16,185,129,0.2)';
                } else if (c.estadoSalud === 'enfriado' || c.estadoSalud === 'frio') {
                  healthColor = 'rgba(245,158,11,0.1)';
                  healthText = '🟡 Enfriado';
                  healthBorder = 'rgba(245,158,11,0.2)';
                } else {
                  healthColor = 'rgba(59,130,246,0.1)';
                  healthText = '🔵 Prospecto';
                  healthBorder = 'rgba(59,130,246,0.2)';
                }

                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                    <td style={{ padding: '0.8rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Building size={12} color="var(--accent-primary)" /> {c.empresa || 'Cliente Particular'}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{c.nombre} {c.apellido} • {c.correo}</span>
                      </div>
                    </td>
                    <td style={{ padding: '0.8rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.85rem' }}>{c.tipoEvento}</span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {c.promedioAudifonos > 0 ? `🎧 Avg: ${c.promedioAudifonos} audífonos` : '🎧 Sin registro'}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '0.8rem' }}>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        <Calendar size={11} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                        {c.fechaIngresoStr}
                      </span>
                    </td>
                    <td style={{ padding: '0.8rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600, color: '#10b981' }}>${c.ltv.toLocaleString('es-CL')}</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>LTV Acumulado</span>
                      </div>
                    </td>
                    <td style={{ padding: '0.8rem' }}>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        padding: '3px 8px', 
                        borderRadius: '12px', 
                        background: healthColor, 
                        border: `1px solid ${healthBorder}`,
                        fontWeight: 600
                      }}>
                        {healthText}
                      </span>
                    </td>
                    <td style={{ padding: '0.8rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.3rem' }}>
                        <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => handleOpenEdit(c)}>
                          <Edit2 size={14} />
                        </button>
                        <button className="btn btn-ghost" style={{ padding: '4px 8px', color: 'var(--color-tomato)' }} onClick={() => { if(window.confirm(`¿Seguro que deseas eliminar a ${c.nombre}?`)) removeCliente(c.id) }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredClients.length === 0 && (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No se encontraron clientes bajo esta segmentación.</div>
          )}
        </div>
      </div>

      {/* 5. Modal de Formulario de Cliente */}
      {isModalOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 9999 }}>
          <div className="modal-content" style={{ margin: 'auto', maxWidth: '550px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{editMode ? 'Editar Información del Cliente' : 'Registrar Nuevo Cliente'}</h2>
              <button className="btn btn-ghost" style={{ padding: '4px' }} onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              
              <div style={{ display: 'flex', gap: '0.8rem' }}>
                <div className="input-group" style={{ flex: 1, margin: 0 }}>
                  <label className="input-label">Nombre</label>
                  <input required type="text" className="input-control" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
                </div>
                <div className="input-group" style={{ flex: 1, margin: 0 }}>
                  <label className="input-label">Apellido</label>
                  <input required type="text" className="input-control" value={formData.apellido} onChange={e => setFormData({...formData, apellido: e.target.value})} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.8rem' }}>
                <div className="input-group" style={{ flex: 1, margin: 0 }}>
                  <label className="input-label">Correo Electrónico</label>
                  <input required type="email" className="input-control" value={formData.correo} onChange={e => setFormData({...formData, correo: e.target.value})} />
                </div>
                <div className="input-group" style={{ flex: 1, margin: 0 }}>
                  <label className="input-label">Teléfono</label>
                  <input required type="text" className="input-control" value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.8rem' }}>
                <div className="input-group" style={{ flex: 2, margin: 0 }}>
                  <label className="input-label">Empresa</label>
                  <input type="text" className="input-control" value={formData.empresa} onChange={e => setFormData({...formData, empresa: e.target.value})} />
                </div>
                <div className="input-group" style={{ flex: 1, margin: 0 }}>
                  <label className="input-label">Cargo</label>
                  <input type="text" className="input-control" value={formData.cargo} onChange={e => setFormData({...formData, cargo: e.target.value})} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.8rem' }}>
                <div className="input-group" style={{ flex: 1, margin: 0 }}>
                  <label className="input-label">Tipo de Evento Frecuente</label>
                  <select className="input-control" value={formData.tipoEvento} onChange={e => setFormData({...formData, tipoEvento: e.target.value})}>
                    <option value="Conferencia">🎙️ Conferencia / Traducción</option>
                    <option value="Fiesta">🎧 Fiesta (Audífonos Multi-canal)</option>
                    <option value="Cine al aire libre">🎥 Cine al Aire Libre</option>
                    <option value="Yoga">🧘 Yoga / Wellness</option>
                    <option value="Activación de Marca">💼 Activación de Marca / B2B</option>
                    <option value="Otros">Otros</option>
                  </select>
                </div>
                <div className="input-group" style={{ flex: 1, margin: 0 }}>
                  <label className="input-label">Fecha de Ingreso</label>
                  <input type="date" className="input-control" value={formData.fechaIngreso} onChange={e => setFormData({...formData, fechaIngreso: e.target.value})} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.8rem' }}>
                <div className="input-group" style={{ flex: 2, margin: 0 }}>
                  <label className="input-label">Dirección Empresa</label>
                  <input type="text" className="input-control" value={formData.direccionEmpresa} onChange={e => setFormData({...formData, direccionEmpresa: e.target.value})} />
                </div>
                <div className="input-group" style={{ flex: 1, margin: 0 }}>
                  <label className="input-label">Comuna</label>
                  <input type="text" className="input-control" value={formData.comuna} onChange={e => setFormData({...formData, comuna: e.target.value})} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.2rem' }}>
                <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Guardar Cambios</button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default ClientSearchModule;
