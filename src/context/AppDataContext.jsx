import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { initGoogleScripts, authenticateGoogle, syncServiceToCalendar, deleteCalendarEvent, listDriveFiles } from '../services/GoogleCalendarService';

const AppDataContext = createContext();

export const AppDataProvider = ({ children }) => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [viewParams, setViewParams] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGoogleLinked, setIsGoogleLinked] = useState(localStorage.getItem('google_calendar_linked') === 'true');

  const [menuNames, setMenuNames] = useState({
    dashboard: 'Dashboard',
    kanban: 'Flujo de Trabajo',
    clientes: 'Clientes',
    inventario: 'Inventario',
    cotizaciones: 'Cotizaciones',
    marketing: 'Marketing & Growth'
  });

  const [clientes, setClientes] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [cotizaciones, setCotizaciones] = useState([]);

  // Kanban visual state
  const [kanbanExpandedYears, setKanbanExpandedYears] = useState({});
  const [kanbanExpandedMonths, setKanbanExpandedMonths] = useState({});
  const [kanbanExpandedStage, setKanbanExpandedStage] = useState(null);
  const [selectedKanbanMonth, setSelectedKanbanMonth] = useState(null);

  const isArchived = (s) => {
    if (s.etapa !== 'Cotizado' || !s.fechaInicio) return false;
    return new Date(s.fechaInicio) < new Date();
  };

  const kanbanGroupedData = useMemo(() => {
    const years = {};
    const sinFecha = [];
    (servicios || []).forEach(s => {
      if (isArchived(s)) return; // Filter out archived from main kanban groupings

      if(!s.fechaInicio) {
        sinFecha.push(s);
        return;
      }
      // Extraer YYYY y MM de forma segura
      const match = String(s.fechaInicio).match(/^(\d{4})-(\d{2})/);
      if (!match) {
        sinFecha.push(s);
        return;
      }
      const y = match[1];
      const m = match[2];
      if (!years[y]) years[y] = {};
      if (!years[y][m]) years[y][m] = [];
      years[y][m].push(s);
    });
    return { years, sinFecha };
  }, [servicios]);

  const archivados = useMemo(() => {
    return (servicios || []).filter(isArchived);
  }, [servicios]);

  // Fetch data from Supabase
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Clientes
      const { data: clis, error: e1 } = await supabase.from('clientes').select('*');
      if (e1) throw e1;
      if (clis) setClientes(clis.map(c => ({
        ...c,
        direccionEmpresa: c.direccion_empresa,
        tipoEvento: c.tipo_evento
      })));

      // Inventario
      const { data: inv, error: e2 } = await supabase.from('inventario').select('*');
      if (e2) throw e2;
      if (inv) setInventario(inv.map(i => ({
        idEquipo: i.id_equipo,
        nombreEquipo: i.nombre_equipo,
        categoria: i.categoria,
        stockTotal: i.stock_total,
        ubicacionBodega: i.ubicacion_bodega
      })));

      // Servicios
      const { data: servs, error: e3 } = await supabase.from('servicios').select('*');
      if (e3) throw e3;
      if (servs) setServicios(servs.map(s => ({
        idServicio: s.id_servicio,
        clienteId: s.cliente_id,
        direccionEvento: s.direccion_evento,
        fechaInicio: s.fecha_inicio,
        fechaFin: s.fecha_fin,
        etapa: s.etapa,
        descuento: s.descuento,
        moneda: s.moneda,
        googleEventId: s.google_event_id,
        pagoAdelanto: s.pago_adelanto || false
      })));

      // Cotizaciones
      const { data: cots, error: e4 } = await supabase.from('cotizaciones').select('*');
      if (e4) throw e4;
      if (cots) setCotizaciones(cots.map(c => ({
        idCotizacion: c.id_cotizacion,
        servicioId: c.servicio_id,
        equipoId: c.equipo_id,
        descripcion: c.descripcion,
        cantidad: c.cantidad,
        dias: c.dias,
        precioUnitario: c.precio_unitario
      })));

    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Error al conectar con la base de datos: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    initGoogleScripts().then(() => {
      // Si estaba vinculado antes, intentar reconectar silenciosamente
      if (localStorage.getItem('google_calendar_linked') === 'true') {
        authenticateGoogle(true).catch(err => {
          console.warn('Auto-link failed:', err);
          setIsGoogleLinked(false);
          localStorage.removeItem('google_calendar_linked');
        });
      }
    });
  }, []);

  const linkGoogle = async () => {
    try {
      await authenticateGoogle(false);
      setIsGoogleLinked(true);
      localStorage.setItem('google_calendar_linked', 'true');
      return true;
    } catch (err) {
      console.error('Auth error:', err);
      return false;
    }
  };

  const unlinkGoogle = () => {
    setIsGoogleLinked(false);
    localStorage.removeItem('google_calendar_linked');
    // Forzar limpieza de tokens si es necesario (recarga)
    window.location.reload();
  };

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const generateId = (prefix) => {
    if (prefix === 'S') return generateCorrelativeId();
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const generateCorrelativeId = () => {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `${yy}${mm}`;
    
    // Filtrar servicios que ya usen el formato correlativo para este mes
    const sameMonthServicios = servicios.filter(s => 
      s.idServicio && 
      typeof s.idServicio === 'string' && 
      s.idServicio.startsWith(prefix) &&
      s.idServicio.length >= 6
    );
    
    let nextNum = 1;
    if (sameMonthServicios.length > 0) {
      const numbers = sameMonthServicios.map(s => {
        // Extraer la parte numérica después de AAMM
        const numPart = s.idServicio.substring(4);
        const parsed = parseInt(numPart, 10);
        return isNaN(parsed) ? 0 : parsed;
      });
      nextNum = Math.max(...numbers) + 1;
    }
    
    return `${prefix}${String(nextNum).padStart(2, '0')}`;
  };

  const updateMenuName = async (id, newName) => {
    const updated = { ...menuNames, [id]: newName };
    setMenuNames(updated);
    try {
      await supabase.from('configuracion').upsert({ clave: 'menu_names', valor: updated });
    } catch (e) { console.error(e); }
  };

  const navigate = (view, params = null) => {
    setViewParams(params);
    setCurrentView(view);
  };

  const getCotizacionesEnriched = () => {
    return cotizaciones.map(c => {
      const subtotal = c.cantidad * c.dias * c.precioUnitario;
      const iva = subtotal * 0.19;
      const total = subtotal + iva;
      return { ...c, subtotal, iva, total };
    });
  };

  const getStockActual = (idEquipo, fechaInicioRef = null, fechaFinRef = null, excludeServicioId = null) => {
    const equipo = inventario.find(e => e.idEquipo === idEquipo);
    if (!equipo) return 0;
    
    const refStart = fechaInicioRef ? new Date(fechaInicioRef).getTime() : Date.now();
    const refEnd = fechaFinRef ? new Date(fechaFinRef).getTime() : refStart + (24 * 60 * 60 * 1000);

    let totalUsado = 0;
    
    const serviciosActivos = servicios.filter(s => {
       if (s.etapa === 'Pagado') return false; 
       if (excludeServicioId && s.idServicio === excludeServicioId) return false;
       if (!s.fechaInicio || !s.fechaFin) return false;

       const sStart = new Date(s.fechaInicio).getTime();
       const sEnd = new Date(s.fechaFin).getTime();
       
       return (refStart <= sEnd && refEnd >= sStart);
    }).map(s => s.idServicio);
    
    cotizaciones.forEach(c => {
      if(c.equipoId === idEquipo && serviciosActivos.includes(c.servicioId)) {
        totalUsado += c.cantidad;
      }
    });

    return equipo.stockTotal - totalUsado;
  };

  const handleCalendarSync = async (servicioObj, itemsArr = []) => {
    if (!isGoogleLinked || !servicioObj.fechaInicio) return;
    const cliente = clientes.find(c => c.id === servicioObj.clienteId);
    const clienteName = cliente ? (cliente.empresa || `${cliente.nombre} ${cliente.apellido}`) : 'Cliente';
    const eventId = await syncServiceToCalendar(servicioObj, clienteName, itemsArr);
    
    if (eventId && eventId !== servicioObj.googleEventId) {
      servicioObj.googleEventId = eventId;
      setServicios(prev => prev.map(s => s.idServicio === servicioObj.idServicio ? { ...s, googleEventId: eventId } : s));
      await supabase.from('servicios').update({ google_event_id: eventId }).eq('id_servicio', servicioObj.idServicio);
    }
  };

  const updateServiceStage = async (idServicio, newStage) => {
    const s = servicios.find(srv => srv.idServicio === idServicio);
    const updatedS = { ...s, etapa: newStage };
    
    setServicios(servicios.map(srv => srv.idServicio === idServicio ? updatedS : srv));
    await supabase.from('servicios').update({ etapa: newStage }).eq('id_servicio', idServicio);

    // Sincronizar con Google Calendar si está vinculado
    if (isGoogleLinked) {
      const items = cotizaciones.filter(c => c.servicioId === idServicio);
      await handleCalendarSync(updatedS, items);
    }
  };

  const togglePagoAdelanto = async (idServicio) => {
    const s = servicios.find(srv => srv.idServicio === idServicio);
    if (!s) return;
    const newVal = !s.pagoAdelanto;
    const updatedS = { ...s, pagoAdelanto: newVal };
    
    setServicios(servicios.map(srv => srv.idServicio === idServicio ? updatedS : srv));
    
    try {
      await supabase.from('servicios').update({ pago_adelanto: newVal }).eq('id_servicio', idServicio);
    } catch (e) {
      console.error("Error updating advance payment. Make sure the column 'pago_adelanto' exists in Supabase.", e);
    }

    // Sincronizar con Google Calendar
    if (isGoogleLinked) {
      const items = cotizaciones.filter(c => c.servicioId === idServicio);
      await handleCalendarSync(updatedS, items);
    }
  };

  const updateServiceDiscount = async (idServicio, newDiscount) => {
    const val = Number(newDiscount) || 0;
    setServicios(servicios.map(s => s.idServicio === idServicio ? { ...s, descuento: val } : s));
    await supabase.from('servicios').update({ descuento: val }).eq('id_servicio', idServicio);
  };

  const updateServiceCurrency = async (idServicio, currency) => {
    try {
      const { error } = await supabase.from('servicios').update({ moneda: currency }).eq('id_servicio', idServicio);
      if (error) throw error;
      setServicios(prev => prev.map(s => s.idServicio === idServicio ? { ...s, moneda: currency } : s));
    } catch (error) { console.error('Error updating service currency', error); alert('Error al actualizar moneda del servicio.'); }
  };

  const formatDateDDMMYYYY = (dateStr) => {
    if (!dateStr) return '';
    const [d, t] = dateStr.split('T');
    if (!d) return dateStr;
    const [y, m, day] = d.split('-');
    if (!y || !m || !day) return dateStr;
    return t ? `${day}/${m}/${y} ${t.substring(0,5)}` : `${day}/${m}/${y}`;
  };

  const addServicio = async (servicioData) => {
    const idServicio = generateCorrelativeId();
    let newS = { ...servicioData, idServicio, etapa: 'Cotizado', descuento: 0, moneda: 'CLP' };
    
    try {
      // Sincronizar con Google Calendar ANTES de guardar en Supabase para obtener el eventId
      let googleEventId = null;
      if (isGoogleLinked) {
        const cliente = clientes.find(c => c.id === servicioData.clienteId);
        const clienteName = cliente ? (cliente.empresa || `${cliente.nombre} ${cliente.apellido}`) : 'Cliente';
        googleEventId = await syncServiceToCalendar(newS, clienteName);
        newS.googleEventId = googleEventId;
      }

      const { error } = await supabase.from('servicios').insert({
        id_servicio: idServicio,
        cliente_id: servicioData.clienteId,
        direccion_evento: servicioData.direccionEvento,
        fecha_inicio: servicioData.fechaInicio,
        fecha_fin: servicioData.fechaFin,
        etapa: 'Cotizado',
        descuento: 0,
        moneda: 'CLP',
        google_event_id: googleEventId
      });
      
      if (error) throw error;
      setServicios([...servicios, newS]);
    } catch (err) { alert('Error: ' + err.message); }
  };

  const editServicio = async (idServicio, updatedData) => {
    const s = servicios.find(srv => srv.idServicio === idServicio);
    const merged = { ...s, ...updatedData };

    setServicios(servicios.map(srv => (srv.idServicio === idServicio ? merged : srv)));
    await supabase.from('servicios').update({
      cliente_id: updatedData.clienteId,
      direccion_evento: updatedData.direccionEvento,
      fecha_inicio: updatedData.fechaInicio,
      fecha_fin: updatedData.fechaFin
    }).eq('id_servicio', idServicio);

    // Sincronizar con Google Calendar
    if (isGoogleLinked) {
      const items = cotizaciones.filter(c => c.servicioId === idServicio);
      await handleCalendarSync(merged, items);
    }
  };

  const removeServicio = async (idServicio) => {
    const s = servicios.find(srv => srv.idServicio === idServicio);
    setServicios(servicios.filter(srv => srv.idServicio !== idServicio));
    setCotizaciones(cotizaciones.filter(c => c.servicioId !== idServicio));
    await supabase.from('servicios').delete().eq('id_servicio', idServicio);

    // Eliminar de Google Calendar
    if (isGoogleLinked && s.googleEventId) {
      await deleteCalendarEvent(s.googleEventId);
    }
  };

  const addCliente = async (clienteData) => {
    const id = generateId('C');
    const newC = { ...clienteData, id };
    try {
      const { error } = await supabase.from('clientes').insert({
        id,
        nombre: clienteData.nombre,
        apellido: clienteData.apellido,
        correo: clienteData.correo,
        telefono: clienteData.telefono,
        direccion_empresa: clienteData.direccionEmpresa,
        comuna: clienteData.comuna,
        pais: clienteData.pais,
        empresa: clienteData.empresa,
        cargo: clienteData.cargo,
        tipo_evento: clienteData.tipoEvento
      });
      if (error) throw error;
      setClientes([...clientes, newC]);
    } catch (err) { alert('Error: ' + err.message); }
  };

  const editCliente = async (id, updatedData) => {
    setClientes(clientes.map(c => (c.id === id ? { ...c, ...updatedData } : c)));
    await supabase.from('clientes').update({
      nombre: updatedData.nombre,
      apellido: updatedData.apellido,
      correo: updatedData.correo,
      telefono: updatedData.telefono,
      direccion_empresa: updatedData.direccionEmpresa,
      comuna: updatedData.comuna,
      pais: updatedData.pais,
      empresa: updatedData.empresa,
      cargo: updatedData.cargo,
      tipo_evento: updatedData.tipoEvento
    }).eq('id', id);
  };

  const removeCliente = async (id) => {
    setClientes(clientes.filter(c => c.id !== id));
    await supabase.from('clientes').delete().eq('id', id);
  };

  const addEquipo = async (equipoData) => {
    const idEquipo = generateId('E');
    const newE = { ...equipoData, idEquipo, stockTotal: Number(equipoData.stockTotal) };
    try {
      const { error } = await supabase.from('inventario').insert({
        id_equipo: idEquipo,
        nombre_equipo: equipoData.nombreEquipo,
        categoria: equipoData.categoria,
        stock_total: Number(equipoData.stockTotal),
        ubicacion_bodega: equipoData.ubicacionBodega
      });
      if (error) throw error;
      setInventario([...inventario, newE]);
    } catch (err) { alert('Error: ' + err.message); }
  };

  const editEquipo = async (idEquipo, updatedData) => {
    setInventario(inventario.map(e => (e.idEquipo === idEquipo ? { ...e, ...updatedData, stockTotal: Number(updatedData.stockTotal) } : e)));
    await supabase.from('inventario').update({
      nombre_equipo: updatedData.nombreEquipo,
      categoria: updatedData.categoria,
      stock_total: Number(updatedData.stockTotal),
      ubicacion_bodega: updatedData.ubicacionBodega
    }).eq('id_equipo', idEquipo);
  };

  const removeEquipo = async (idEquipo) => {
    setInventario(inventario.filter(e => e.idEquipo !== idEquipo));
    await supabase.from('inventario').delete().eq('id_equipo', idEquipo);
  };

  const addItemCotizacion = async (itemData) => {
    const idCotizacion = generateId('Q');
    const newQ = { ...itemData, idCotizacion, cantidad: Number(itemData.cantidad), dias: Number(itemData.dias), precioUnitario: Number(itemData.precioUnitario) };
    try {
      const { error } = await supabase.from('cotizaciones').insert({
        id_cotizacion: idCotizacion,
        servicio_id: itemData.servicioId,
        equipo_id: itemData.equipoId,
        descripcion: itemData.descripcion,
        cantidad: Number(itemData.cantidad),
        dias: Number(itemData.dias),
        precio_unitario: Number(itemData.precioUnitario)
      });
      if (error) throw error;
      const updatedCots = [...cotizaciones, newQ];
      setCotizaciones(updatedCots);

      // Sincronizar con Google Calendar si el servicio existe
      if (isGoogleLinked) {
        const s = servicios.find(srv => srv.idServicio === itemData.servicioId);
        if (s) {
          const items = updatedCots.filter(c => c.servicioId === s.idServicio);
          await handleCalendarSync(s, items);
        }
      }
    } catch (err) { alert('Error: ' + err.message); }
  };

  const removeItemCotizacion = async (idCotizacion) => {
    const updatedCots = cotizaciones.filter(c => c.idCotizacion !== idCotizacion);
    const itemToRemove = cotizaciones.find(c => c.idCotizacion === idCotizacion);
    setCotizaciones(updatedCots);
    await supabase.from('cotizaciones').delete().eq('id_cotizacion', idCotizacion);

    // Sincronizar con Google Calendar
    if (isGoogleLinked && itemToRemove) {
      const s = servicios.find(srv => srv.idServicio === itemToRemove.servicioId);
      if (s) {
        const items = updatedCots.filter(c => c.servicioId === s.idServicio);
        await handleCalendarSync(s, items);
      }
    }
  };

  const editItemCotizacion = async (idCotizacion, updatedData) => {
    const updatedCots = cotizaciones.map(c => {
      if (c.idCotizacion === idCotizacion) {
        return { 
          ...c, 
          ...updatedData, 
          cantidad: updatedData.cantidad !== undefined ? Number(updatedData.cantidad) : c.cantidad,
          dias: updatedData.dias !== undefined ? Number(updatedData.dias) : c.dias,
          precioUnitario: updatedData.precioUnitario !== undefined ? Number(updatedData.precioUnitario) : c.precioUnitario
        };
      }
      return c;
    });
    setCotizaciones(updatedCots);

    await supabase.from('cotizaciones').update({
      equipo_id: updatedData.equipoId,
      descripcion: updatedData.descripcion,
      cantidad: updatedData.cantidad !== undefined ? Number(updatedData.cantidad) : undefined,
      dias: updatedData.dias !== undefined ? Number(updatedData.dias) : undefined,
      precio_unitario: updatedData.precioUnitario !== undefined ? Number(updatedData.precioUnitario) : undefined
    }).eq('id_cotizacion', idCotizacion);

    // Sincronizar con Google Calendar
    if (isGoogleLinked) {
      const currentItem = updatedCots.find(c => c.idCotizacion === idCotizacion);
      if (currentItem) {
        const s = servicios.find(srv => srv.idServicio === currentItem.servicioId);
        if (s) {
          const items = updatedCots.filter(c => c.servicioId === s.idServicio);
          await handleCalendarSync(s, items);
        }
      }
    }
  };

  const value = {
    currentView, viewParams, navigate, isLoading,
    menuNames, updateMenuName,
    clientes, addCliente, editCliente, removeCliente,
    inventario, addEquipo, editEquipo, removeEquipo,
    servicios, updateServiceStage, updateServiceDiscount, updateServiceCurrency, addServicio, editServicio, removeServicio,
    togglePagoAdelanto,
    cotizaciones: getCotizacionesEnriched(), addItemCotizacion, removeItemCotizacion, editItemCotizacion,
    getStockActual,
    isGoogleLinked, linkGoogle, unlinkGoogle, logout, listDriveContent,
    kanbanExpandedYears, setKanbanExpandedYears,
    kanbanExpandedMonths, setKanbanExpandedMonths,
    kanbanExpandedStage, setKanbanExpandedStage,
    selectedKanbanMonth, setSelectedKanbanMonth, kanbanGroupedData,
    archivados, isArchived,
    formatDateDDMMYYYY
  };

  return (
    <AppDataContext.Provider value={value}>
      {!isLoading ? children : (
        <div style={{ height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-dark)', color: '#fff' }}>
          <div className="animate-pulse">Sincronizando con EcoSilence v2...</div>
        </div>
      )}
    </AppDataContext.Provider>
  );
};

export default AppDataContext;
export const useAppStore = () => useContext(AppDataContext);
