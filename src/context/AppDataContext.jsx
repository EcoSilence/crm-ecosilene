import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const AppDataContext = createContext();

export const AppDataProvider = ({ children }) => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [viewParams, setViewParams] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [menuNames, setMenuNames] = useState({
    dashboard: 'Dashboard',
    kanban: 'Flujo de Trabajo',
    clientes: 'Clientes',
    inventario: 'Inventario',
    cotizaciones: 'Cotizaciones'
  });

  const [clientes, setClientes] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [cotizaciones, setCotizaciones] = useState([]);

  // Fetch data from Supabase
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Clientes
      const { data: clis } = await supabase.from('clientes').select('*');
      if (clis) setClientes(clis.map(c => ({
        ...c,
        direccionEmpresa: c.direccion_empresa,
        tipoEvento: c.tipo_evento
      })));

      // Inventario
      const { data: inv } = await supabase.from('inventario').select('*');
      if (inv) setInventario(inv.map(i => ({
        idEquipo: i.id_equipo,
        nombreEquipo: i.nombre_equipo,
        categoria: i.categoria,
        stockTotal: i.stock_total,
        ubicacionBodega: i.ubicacion_bodega
      })));

      // Servicios
      const { data: servs } = await supabase.from('servicios').select('*');
      if (servs) setServicios(servs.map(s => ({
        idServicio: s.id_servicio,
        clienteId: s.cliente_id,
        direccionEvento: s.direccion_evento,
        fechaInicio: s.fecha_inicio,
        fechaFin: s.fecha_fin,
        etapa: s.etapa,
        descuento: s.descuento,
        moneda: s.moneda
      })));

      // Cotizaciones
      const { data: cots } = await supabase.from('cotizaciones').select('*');
      if (cots) setCotizaciones(cots.map(c => ({
        idCotizacion: c.id_cotizacion,
        servicioId: c.servicio_id,
        equipoId: c.equipo_id,
        descripcion: c.descripcion,
        cantidad: c.cantidad,
        dias: c.dias,
        precioUnitario: c.precio_unitario
      })));

      // Configuracion
      const { data: conf } = await supabase.from('configuracion').select('valor').eq('clave', 'menu_names').single();
      if (conf) setMenuNames(conf.valor);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const updateMenuName = async (id, newName) => {
    const updated = { ...menuNames, [id]: newName };
    setMenuNames(updated);
    await supabase.from('configuracion').upsert({ clave: 'menu_names', valor: updated });
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

  const updateServiceStage = async (idServicio, newStage) => {
    setServicios(servicios.map(s => s.idServicio === idServicio ? { ...s, etapa: newStage } : s));
    await supabase.from('servicios').update({ etapa: newStage }).eq('id_servicio', idServicio);
  };

  const updateServiceDiscount = async (idServicio, newDiscount) => {
    const val = Number(newDiscount) || 0;
    setServicios(servicios.map(s => s.idServicio === idServicio ? { ...s, descuento: val } : s));
    await supabase.from('servicios').update({ descuento: val }).eq('id_servicio', idServicio);
  };

  const updateServiceCurrency = async (idServicio, newCurrency) => {
    setServicios(servicios.map(s => s.idServicio === idServicio ? { ...s, moneda: newCurrency } : s));
    await supabase.from('servicios').update({ moneda: newCurrency }).eq('id_servicio', idServicio);
  };

  const addServicio = async (servicioData) => {
    const idServicio = `S-${crypto.randomUUID().split('-')[0]}`;
    const newS = { ...servicioData, idServicio, etapa: 'Cotizado', descuento: 0, moneda: 'CLP' };
    setServicios([...servicios, newS]);
    await supabase.from('servicios').insert({
      id_servicio: idServicio,
      cliente_id: servicioData.clienteId,
      direccion_evento: servicioData.direccionEvento,
      fecha_inicio: servicioData.fechaInicio,
      fecha_fin: servicioData.fechaFin,
      etapa: 'Cotizado',
      descuento: 0,
      moneda: 'CLP'
    });
  };

  const editServicio = async (idServicio, updatedData) => {
    setServicios(servicios.map(s => (s.idServicio === idServicio ? { ...s, ...updatedData } : s)));
    await supabase.from('servicios').update({
      cliente_id: updatedData.clienteId,
      direccion_evento: updatedData.direccionEvento,
      fecha_inicio: updatedData.fechaInicio,
      fecha_fin: updatedData.fechaFin
    }).eq('id_servicio', idServicio);
  };

  const removeServicio = async (idServicio) => {
    setServicios(servicios.filter(s => s.idServicio !== idServicio));
    setCotizaciones(cotizaciones.filter(c => c.servicioId !== idServicio));
    await supabase.from('servicios').delete().eq('id_servicio', idServicio);
  };

  const addCliente = async (clienteData) => {
    const id = `C-${crypto.randomUUID().split('-')[0]}`;
    const newC = { ...clienteData, id };
    setClientes([...clientes, newC]);
    await supabase.from('clientes').insert({
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
    const idEquipo = `E-${crypto.randomUUID().split('-')[0]}`;
    const newE = { ...equipoData, idEquipo, stockTotal: Number(equipoData.stockTotal) };
    setInventario([...inventario, newE]);
    await supabase.from('inventario').insert({
      id_equipo: idEquipo,
      nombre_equipo: equipoData.nombreEquipo,
      categoria: equipoData.categoria,
      stock_total: Number(equipoData.stockTotal),
      ubicacion_bodega: equipoData.ubicacionBodega
    });
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
    const idCotizacion = `Q-${crypto.randomUUID().split('-')[0]}`;
    const newQ = { ...itemData, idCotizacion, cantidad: Number(itemData.cantidad), dias: Number(itemData.dias), precioUnitario: Number(itemData.precioUnitario) };
    setCotizaciones([...cotizaciones, newQ]);
    await supabase.from('cotizaciones').insert({
      id_cotizacion: idCotizacion,
      servicio_id: itemData.servicioId,
      equipo_id: itemData.equipoId,
      descripcion: itemData.descripcion,
      cantidad: Number(itemData.cantidad),
      dias: Number(itemData.dias),
      precio_unitario: Number(itemData.precioUnitario)
    });
  };

  const removeItemCotizacion = async (idCotizacion) => {
    setCotizaciones(cotizaciones.filter(c => c.idCotizacion !== idCotizacion));
    await supabase.from('cotizaciones').delete().eq('id_cotizacion', idCotizacion);
  };

  const editItemCotizacion = async (idCotizacion, updatedData) => {
    setCotizaciones(cotizaciones.map(c => {
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
    }));
    await supabase.from('cotizaciones').update({
      equipo_id: updatedData.equipoId,
      descripcion: updatedData.descripcion,
      cantidad: updatedData.cantidad !== undefined ? Number(updatedData.cantidad) : undefined,
      dias: updatedData.dias !== undefined ? Number(updatedData.dias) : undefined,
      precio_unitario: updatedData.precioUnitario !== undefined ? Number(updatedData.precioUnitario) : undefined
    }).eq('id_cotizacion', idCotizacion);
  };

  const value = {
    currentView, viewParams, navigate, isLoading,
    menuNames, updateMenuName,
    clientes, addCliente, editCliente, removeCliente,
    inventario, addEquipo, editEquipo, removeEquipo,
    servicios, updateServiceStage, updateServiceDiscount, updateServiceCurrency, addServicio, editServicio, removeServicio,
    cotizaciones: getCotizacionesEnriched(), addItemCotizacion, removeItemCotizacion, editItemCotizacion,
    getStockActual
  };

  return (
    <AppDataContext.Provider value={value}>
      {!isLoading ? children : (
        <div style={{ height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-dark)', color: '#fff' }}>
          <div className="animate-pulse">Sincronizando con la nube...</div>
        </div>
      )}
    </AppDataContext.Provider>
  );
};

export default AppDataContext;
export const useAppStore = () => useContext(AppDataContext);
