import React, { createContext, useContext, useState, useEffect } from 'react';

const AppDataContext = createContext();

const initialClients = [
  { id: 'C1', nombre: 'Juan', apellido: 'Pérez', correo: 'juan.perez@eventos.com', telefono: '+56912345678', direccionEmpresa: 'Av. Providencia 1234', comuna: 'Providencia', pais: 'Chile', empresa: 'Eventos Globales', cargo: 'Productor', tipoEvento: 'Conferencia' },
  { id: 'C2', nombre: 'María', apellido: 'Gómez', correo: 'mgomez@corptech.cl', telefono: '+56987654321', direccionEmpresa: 'Las Condes 456', comuna: 'Las Condes', pais: 'Chile', empresa: 'CorpTech', cargo: 'HR Manager', tipoEvento: 'Workshop' },
  { id: 'C3', nombre: 'Beatriz', apellido: 'Gonzalez', correo: 'beatriz.g@live.cl', telefono: '+56966330348', direccionEmpresa: 'pintor laureano guevara ,', comuna: '', pais: 'Chile', empresa: 'FitconlaBea', cargo: 'CEO', tipoEvento: 'Conferencia' },
  { id: 'C4', nombre: 'Camilo', apellido: 'Collante', correo: 'camilo.collante@gmail.com', telefono: '+56953799875', direccionEmpresa: 'pintor laureano guevara 60, la reina ,', comuna: '', pais: 'Chile', empresa: 'EcoSilence', cargo: 'CEO', tipoEvento: 'Conferencia' }
];

const initialInventory = [
  { idEquipo: 'E1', nombreEquipo: 'Audífono Inalámbrico', categoria: 'Audio', stockTotal: 50, stockActual: 50, ubicacionBodega: 'Pasillo A' },
  { idEquipo: 'E2', nombreEquipo: 'Transmisor TX', categoria: 'Transmisión', stockTotal: 20, stockActual: 20, ubicacionBodega: 'Pasillo B' },
  { idEquipo: 'E3', nombreEquipo: 'Micrófono Solapa', categoria: 'Audio', stockTotal: 30, stockActual: 30, ubicacionBodega: 'Pasillo A' },
  { idEquipo: 'E4', nombreEquipo: 'Cabina Traducción', categoria: 'Estructura', stockTotal: 5, stockActual: 5, ubicacionBodega: 'Bodega Central' },
  { idEquipo: 'E5', nombreEquipo: 'sistema de sonido columna activa', categoria: 'Audio', stockTotal: 5, stockActual: 5, ubicacionBodega: 'bodega central' }
];

const initialServices = [
  { idServicio: 'S1', clienteId: 'C1', direccionEvento: 'Hotel W Santiago', fechaInicio: '2026-05-10T09:00', fechaFin: '2026-05-10T18:00', etapa: 'Cotizado', descuento: 0, moneda: 'CLP' },
  { idServicio: 'S2', clienteId: 'C2', direccionEvento: 'Centro de Convenciones', fechaInicio: '2026-06-15T10:00', fechaFin: '2026-06-16T18:00', etapa: 'Aprobado', descuento: 0, moneda: 'CLP' },
  { idServicio: 'S3', clienteId: 'C1', direccionEvento: 'Espacio Riesco', fechaInicio: '2026-04-18T08:00', fechaFin: '2026-04-18T20:00', etapa: 'Por Cobrar', descuento: 0, moneda: 'CLP' },
  { idServicio: 'S4', clienteId: 'C2', direccionEvento: 'Oficinas CorpTech', fechaInicio: '2026-04-01T09:00', fechaFin: '2026-04-01T13:00', etapa: 'Pagado', descuento: 0, moneda: 'CLP' },
  { idServicio: 'S5', clienteId: 'C3', direccionEvento: 'costanera center', fechaInicio: '2026-08-10T14:30', fechaFin: '2026-08-10T18:00', etapa: 'Cotizado', descuento: 0, moneda: 'CLP' }
];

const initialQuotes = [
  { idCotizacion: 'Q1', servicioId: 'S2', equipoId: 'E1', descripcion: 'Audífonos para asistentes', cantidad: 30, dias: 2, precioUnitario: 5000 },
  { idCotizacion: 'Q2', servicioId: 'S2', equipoId: 'E2', descripcion: 'Transmisor principal', cantidad: 1, dias: 2, precioUnitario: 25000 },
  { idCotizacion: 'Q3', servicioId: 'S3', equipoId: 'E3', descripcion: 'Micrófono presentador', cantidad: 2, dias: 1, precioUnitario: 8000 }
];

export const AppDataProvider = ({ children }) => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [viewParams, setViewParams] = useState(null);

  const defaultMenuNames = {
    dashboard: 'Dashboard',
    kanban: 'Flujo de Trabajo',
    clientes: 'Clientes',
    inventario: 'Inventario',
    cotizaciones: 'Cotizaciones'
  };

  const [menuNames, setMenuNames] = useState(() => {
    const saved = localStorage.getItem('eco_menu_names');
    return saved ? JSON.parse(saved) : defaultMenuNames;
  });

  const [clientes, setClientes] = useState(() => {
    const saved = localStorage.getItem('eco_clientes');
    return saved ? JSON.parse(saved) : initialClients;
  });
  const [inventario, setInventario] = useState(() => {
    const saved = localStorage.getItem('eco_inventario');
    return saved ? JSON.parse(saved) : initialInventory;
  });
  const [servicios, setServicios] = useState(() => {
    const saved = localStorage.getItem('eco_servicios');
    return saved ? JSON.parse(saved) : initialServices;
  });
  const [cotizaciones, setCotizaciones] = useState(() => {
    const saved = localStorage.getItem('eco_cotizaciones');
    return saved ? JSON.parse(saved) : initialQuotes;
  });

  useEffect(() => { localStorage.setItem('eco_clientes', JSON.stringify(clientes)); }, [clientes]);
  useEffect(() => { localStorage.setItem('eco_inventario', JSON.stringify(inventario)); }, [inventario]);
  useEffect(() => { localStorage.setItem('eco_servicios', JSON.stringify(servicios)); }, [servicios]);
  useEffect(() => { localStorage.setItem('eco_cotizaciones', JSON.stringify(cotizaciones)); }, [cotizaciones]);
  useEffect(() => { localStorage.setItem('eco_menu_names', JSON.stringify(menuNames)); }, [menuNames]);

  const updateMenuName = (id, newName) => {
    setMenuNames(prev => ({ ...prev, [id]: newName }));
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
    const refEnd = fechaFinRef ? new Date(fechaFinRef).getTime() : refStart + (24 * 60 * 60 * 1000); // Asumir 1 día si no se provee.

    let totalUsado = 0;
    
    const serviciosActivos = servicios.filter(s => {
       if (s.etapa === 'Pagado') return false; 
       if (excludeServicioId && s.idServicio === excludeServicioId) return false;
       if (!s.fechaInicio || !s.fechaFin) return false;

       const sStart = new Date(s.fechaInicio).getTime();
       const sEnd = new Date(s.fechaFin).getTime();
       
       // Verificamos si hay colisión de plazos (Overlap)
       return (refStart <= sEnd && refEnd >= sStart);
    }).map(s => s.idServicio);
    
    cotizaciones.forEach(c => {
      if(c.equipoId === idEquipo && serviciosActivos.includes(c.servicioId)) {
        totalUsado += c.cantidad;
      }
    });

    return equipo.stockTotal - totalUsado;
  };

  const updateServiceStage = (idServicio, newStage) => {
    setServicios(servicios.map(s => s.idServicio === idServicio ? { ...s, etapa: newStage } : s));
  };

  const updateServiceDiscount = (idServicio, newDiscount) => {
    setServicios(servicios.map(s => s.idServicio === idServicio ? { ...s, descuento: Number(newDiscount) || 0 } : s));
  };

  const updateServiceCurrency = (idServicio, newCurrency) => {
    setServicios(servicios.map(s => s.idServicio === idServicio ? { ...s, moneda: newCurrency } : s));
  };

  const addServicio = (servicioData) => {
    const idServicio = `S-${crypto.randomUUID().split('-')[0]}`;
    setServicios([...servicios, { ...servicioData, idServicio, etapa: 'Cotizado', descuento: 0, moneda: 'CLP' }]);
  };

  const editServicio = (idServicio, updatedData) => {
    setServicios(servicios.map(s => (s.idServicio === idServicio ? { ...s, ...updatedData } : s)));
  };

  const removeServicio = (idServicio) => {
    setServicios(servicios.filter(s => s.idServicio !== idServicio));
    setCotizaciones(cotizaciones.filter(c => c.servicioId !== idServicio)); // Cascading delete
  };

  const addCliente = (clienteData) => {
    const id = `C-${crypto.randomUUID().split('-')[0]}`;
    setClientes([...clientes, { ...clienteData, id }]);
  };

  const editCliente = (id, updatedData) => {
    setClientes(clientes.map(c => (c.id === id ? { ...c, ...updatedData } : c)));
  };

  const removeCliente = (id) => {
    setClientes(clientes.filter(c => c.id !== id));
  };

  const addEquipo = (equipoData) => {
    const idEquipo = `E-${crypto.randomUUID().split('-')[0]}`;
    setInventario([...inventario, { ...equipoData, idEquipo, stockTotal: Number(equipoData.stockTotal) }]);
  };

  const editEquipo = (idEquipo, updatedData) => {
    setInventario(inventario.map(e => (e.idEquipo === idEquipo ? { ...e, ...updatedData, stockTotal: Number(updatedData.stockTotal) } : e)));
  };

  const removeEquipo = (idEquipo) => {
    setInventario(inventario.filter(e => e.idEquipo !== idEquipo));
  };

  const addItemCotizacion = (itemData) => {
    const idCotizacion = `Q-${crypto.randomUUID().split('-')[0]}`;
    setCotizaciones([...cotizaciones, { ...itemData, idCotizacion, cantidad: Number(itemData.cantidad), dias: Number(itemData.dias), precioUnitario: Number(itemData.precioUnitario) }]);
  };

  const removeItemCotizacion = (idCotizacion) => {
    setCotizaciones(cotizaciones.filter(c => c.idCotizacion !== idCotizacion));
  };

  const editItemCotizacion = (idCotizacion, updatedData) => {
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
  };

  const value = {
    currentView, viewParams, navigate,
    menuNames, updateMenuName,
    clientes, setClientes, addCliente, editCliente, removeCliente,
    inventario, setInventario, addEquipo, editEquipo, removeEquipo,
    servicios, setServicios, updateServiceStage, updateServiceDiscount, updateServiceCurrency, addServicio, editServicio, removeServicio,
    cotizaciones: getCotizacionesEnriched(), setCotizaciones, addItemCotizacion, removeItemCotizacion, editItemCotizacion,
    getStockActual
  };

  return (
    <AppDataContext.Provider value={value}>
      {children}
    </AppDataContext.Provider>
  );
};

export default AppDataContext;
export const useAppStore = () => useContext(AppDataContext);
