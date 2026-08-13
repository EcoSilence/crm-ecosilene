import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../context/AppDataContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../supabaseClient';
import { 
  FileText, Plus, MapPin, CalendarDays, DollarSign, Download, Trash2, Box, 
  Mail, Printer, X, Save, ArrowLeft, ArrowUp, ArrowDown, Zap, Sparkles, 
  Layers, User, Clock, Percent, ClipboardCheck, AlertCircle, HelpCircle
} from 'lucide-react';

const CotizacionesView = () => {
  const {
    servicios, clientes, inventario, cotizaciones,
    addItemCotizacion, removeItemCotizacion, editItemCotizacion,
    updateServiceDiscount, updateServiceCurrency, viewParams, getStockActual, navigate, menuNames, formatDateDDMMYYYY,
    configurations, reorderCotizacionItems, addCliente, editCliente, addServicio, handleCalendarSync
  } = useAppStore();
  const { addToast } = useToast();

  // Tab activo: 'manual' (Gestor de Presupuestos) o 'rapida' (Captura Rápida & IA)
  const [activeTab, setActiveTab] = useState(viewParams?.tab || 'manual');

  // Servicio seleccionado para cotizar en el gestor manual
  const [selectedServicioId, setSelectedServicioId] = useState(viewParams?.servicioId || '');

  // Formulario de ítem (equipo) a añadir manualmente
  const [formData, setFormData] = useState({ equipoId: '', cantidad: 1, dias: 1, precioUnitario: 0, descripcion: '' });

  // Modal de previsualización Voucher Print
  const [showPreview, setShowPreview] = useState(false);

  // --- ESTADOS PARA CAPTURA RÁPIDA & IA ---
  const [whatsappText, setWhatsappText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisLogs, setAnalysisLogs] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const [quickForm, setQuickForm] = useState({
    empresa: '',
    rut: '',
    encargado: '',
    telefono: '',
    correo: '',
    direccionComercial: '',
    direccionEvento: '',
    fechaEvento: '',
    horaInicio: '18:00',
    horaFin: '23:59',
    cantidadAudifonos: 50,
    canales: 3,
    extras: {
      staff: false,
      transmisorExtra: false,
      iluminacion: false,
      dj: false
    },
    descuento: 0,
    precioAudifono: 5000
  });

  // Update selected service if viewParams changes
  useEffect(() => {
    if (viewParams && viewParams.servicioId) {
      setSelectedServicioId(viewParams.servicioId);
      if (viewParams.tab) {
        setActiveTab(viewParams.tab);
      }
    }
  }, [viewParams]);

  const servicio = servicios.find(s => s.idServicio === selectedServicioId);
  const cliente = servicio ? clientes.find(c => c.id === servicio.clienteId) : null;
  const rawItems = cotizaciones.filter(c => c.servicioId === selectedServicioId);
  const itemsOrder = configurations['orden_cotizacion_' + selectedServicioId] || [];

  const itemsCotizacion = useMemo(() => {
    const items = [...rawItems];
    if (itemsOrder.length > 0) {
      items.sort((a, b) => {
        const indexA = itemsOrder.indexOf(a.idCotizacion);
        const indexB = itemsOrder.indexOf(b.idCotizacion);
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });
    }
    return items;
  }, [rawItems, itemsOrder]);

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

    return () => {
      document.title = originalTitle;
      if (titleTag) titleTag.innerText = originalTagText;
    };
  }, [showPreview, servicio, cliente]);

  const subtotalBruto = itemsCotizacion.reduce((acc, curr) => acc + curr.subtotal, 0);
  const descuentoPorcentaje = servicio?.descuento || 0;
  const descuentoMonto = subtotalBruto * (descuentoPorcentaje / 100);
  const subtotalNeto = subtotalBruto - descuentoMonto;
  const iva = subtotalNeto * 0.19;
  const total = subtotalNeto + iva;
  const totales = { subtotalBruto, descuentoMonto, descuentoPorcentaje, subtotalNeto, iva, total };

  const formatCurrency = (val, currencyCode = 'CLP') => {
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
    if (!selectedServicioId) return addToast('Selecciona un servicio primero', 'warning');
    if (!formData.equipoId) return addToast('Selecciona un equipo', 'warning');

    addItemCotizacion({
      servicioId: selectedServicioId,
      ...formData
    });

    setFormData({ equipoId: '', cantidad: 1, dias: 1, precioUnitario: 0, descripcion: '' });
  };

  const handleMoveUp = (index) => {
    if (index === 0) return;
    const newItems = [...itemsCotizacion];
    const temp = newItems[index];
    newItems[index] = newItems[index - 1];
    newItems[index - 1] = temp;
    reorderCotizacionItems(selectedServicioId, newItems.map(item => item.idCotizacion));
  };

  const handleMoveDown = (index) => {
    if (index === itemsCotizacion.length - 1) return;
    const newItems = [...itemsCotizacion];
    const temp = newItems[index];
    newItems[index] = newItems[index + 1];
    newItems[index + 1] = temp;
    reorderCotizacionItems(selectedServicioId, newItems.map(item => item.idCotizacion));
  };

  // --- LÓGICA DE PARSE DE WHATSAPP / TEXTO ---
  const parseWhatsAppText = (text) => {
    const result = {
      empresa: '',
      rut: '',
      encargado: '',
      telefono: '',
      correo: '',
      direccionComercial: '',
      direccionEvento: '',
      fechaEvento: '',
      horaInicio: '18:00',
      horaFin: '23:59',
      cantidadAudifonos: 50,
      canales: 3,
      extras: {
        staff: false,
        transmisorExtra: false,
        iluminacion: false,
        dj: false
      },
      descuento: 0,
      precioAudifono: 5000
    };

    if (!text) return result;

    // Extract Email
    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i);
    if (emailMatch) result.correo = emailMatch[0];

    // Extract Phone
    const phoneMatch = text.match(/(?:\+?56\s?9?\s?\d{4}\s?\d{4}|\b9\s?\d{4}\s?\d{4}\b)/i);
    if (phoneMatch) result.telefono = phoneMatch[0].replace(/\s+/g, '');

    // Extract RUT
    const rutMatch = text.match(/\b\d{1,2}\.?\d{3}\.?\d{3}-?[\dKk]\b/i);
    if (rutMatch) result.rut = rutMatch[0];

    // Extract Quantity of headphones
    const qtyMatch = text.match(/(\d+)\s*(?:aud[ií]fonos|auriculares|personas|equipos|invitados|unidades|auris|cascos)/i);
    if (qtyMatch) {
      result.cantidadAudifonos = parseInt(qtyMatch[1], 10);
    }

    // Extract channels
    const channelsMatch = text.match(/(\d+)\s*(?:canal(es)?|ambiente(s)?|transmisor(es)?)/i);
    if (channelsMatch) {
      const parsedChannels = parseInt(channelsMatch[1], 10);
      if (parsedChannels >= 1 && parsedChannels <= 3) {
        result.canales = parsedChannels;
      }
    }

    // Extract Extras
    if (/staff|operador|t[eé]cnico/i.test(text)) result.extras.staff = true;
    if (/transmisor\s*(adicional|extra|otro)/i.test(text)) result.extras.transmisorExtra = true;
    if (/iluminaci[oó]n|luces/i.test(text)) result.extras.iluminacion = true;
    if (/dj|cine|pel[ií]cula|outdoor/i.test(text)) result.extras.dj = true;

    // Extract Date (Spanish months or ISO formats)
    const monthNames = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    const dateTextMatch = text.match(/(\d{1,2})\s*(?:de)?\s*(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i);
    if (dateTextMatch) {
      const day = parseInt(dateTextMatch[1], 10);
      const monthName = dateTextMatch[2].toLowerCase();
      const monthIndex = monthNames.indexOf(monthName);
      if (monthIndex !== -1) {
        const year = 2026; // Usamos 2026 según la fecha de la sesión local
        const formattedMonth = String(monthIndex + 1).padStart(2, '0');
        const formattedDay = String(day).padStart(2, '0');
        result.fechaEvento = `${year}-${formattedMonth}-${formattedDay}`;
      }
    } else {
      const isoDateMatch = text.match(/(\d{4})[-/](\d{2})[-/](\d{2})/);
      if (isoDateMatch) {
        result.fechaEvento = `${isoDateMatch[1]}-${isoDateMatch[2]}-${isoDateMatch[3]}`;
      } else {
        const slashDateMatch = text.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
        if (slashDateMatch) {
          const day = slashDateMatch[1].padStart(2, '0');
          const month = slashDateMatch[2].padStart(2, '0');
          const year = slashDateMatch[3];
          result.fechaEvento = `${year}-${month}-${day}`;
        }
      }
    }

    // Extract Hours
    const hoursMatch = text.match(/(\d{1,2})[\s:]*(\d{2})?\s*(?:a|hasta|-)\s*(\d{1,2})[\s:]*(\d{2})?/i);
    if (hoursMatch) {
      const h1 = hoursMatch[1].padStart(2, '0');
      const m1 = (hoursMatch[2] || '00').padStart(2, '0');
      const h2 = hoursMatch[3].padStart(2, '0');
      const m2 = (hoursMatch[4] || '00').padStart(2, '0');
      result.horaInicio = `${h1}:${m1}`;
      result.horaFin = `${h2}:${m2}`;
    }

    // Address
    const dirMatch = text.match(/(?:direcci[oó]n|lugar|evento en|en)\s*:\s*([^\n\r]+)/i);
    if (dirMatch) {
      result.direccionEvento = dirMatch[1].trim();
      result.direccionComercial = dirMatch[1].trim();
    } else {
      const enMatch = text.match(/en\s+([A-Za-z0-9\s.]+)(?:de|el|para|con|$)/i);
      if (enMatch && enMatch[1].trim().length > 5) {
        result.direccionEvento = enMatch[1].trim();
        result.direccionComercial = enMatch[1].trim();
      }
    }

    // Contact name
    const nameMatch = text.match(/(?:nombre|encargado|contacto|atenci[oó]n|soy|mi nombre es)\s*:?\s*([A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+)?)/i);
    if (nameMatch) {
      result.encargado = nameMatch[1].trim();
    }

    // Company
    const companyMatch = text.match(/(?:empresa|compa[ñn][ií]a|de)\s*:\s*([A-Za-z0-9À-ÿ\s.]+)/i);
    if (companyMatch) {
      result.empresa = companyMatch[1].trim();
    } else {
      const deCompany = text.match(/de\s+([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+)?)/);
      if (deCompany) {
        result.empresa = deCompany[1].trim();
      }
    }

    return result;
  };

  const handleIAAnalysis = () => {
    if (!whatsappText.trim()) return addToast('Copia y pega algún mensaje de WhatsApp primero.', 'warning');
    
    setIsAnalyzing(true);
    setAnalysisLogs([]);

    const steps = [
      { msg: '🔍 Leyendo mensaje de WhatsApp...', delay: 0 },
      { msg: '👤 Extrayendo datos de contacto (empresa, encargado, correo)...', delay: 400 },
      { msg: '📅 Analizando logística (fecha y lugar del evento)...', delay: 800 },
      { msg: '🎧 Extrayendo cantidad de audífonos y canales...', delay: 1200 },
      { msg: '⚙️ Detección de requerimientos y personal técnico adicional...', delay: 1500 },
      { msg: '✨ ¡Completado! Datos transferidos al formulario.', delay: 1800 }
    ];

    steps.forEach((step) => {
      setTimeout(() => {
        setAnalysisLogs(prev => [...prev, step.msg]);
        if (step.delay === 1800) {
          const parsed = parseWhatsAppText(whatsappText);
          setQuickForm(prev => ({
            ...prev,
            ...parsed,
            // Mantener valores del parser pero sin sobreescribir si estaban vacíos
            encargado: parsed.encargado || prev.encargado,
            empresa: parsed.empresa || prev.empresa,
            correo: parsed.correo || prev.correo,
            telefono: parsed.telefono || prev.telefono,
            direccionEvento: parsed.direccionEvento || prev.direccionEvento,
            direccionComercial: parsed.direccionComercial || prev.direccionComercial,
            fechaEvento: parsed.fechaEvento || prev.fechaEvento,
            cantidadAudifonos: parsed.cantidadAudifonos || prev.cantidadAudifonos,
            canales: parsed.canales || prev.canales
          }));
          setIsAnalyzing(false);
          addToast('Mensaje de WhatsApp analizado y formulario completado.', 'success');
        }
      }, step.delay);
    });
  };

  // --- LÓGICA DE ESTIMACIÓN DE PRECIOS ---
  const quickEstimates = useMemo(() => {
    const qty = Number(quickForm.cantidadAudifonos) || 0;
    const priceUnit = Number(quickForm.precioAudifono) || 0;
    const subtotalAudifonos = qty * priceUnit;
    
    // Si elige 2 o 3 canales, se incluye un transmisor y se añade arriendo extra si aplica
    const subtotalCanales = quickForm.canales > 1 ? 25000 : 0;

    let subtotalExtras = 0;
    if (quickForm.extras.staff) subtotalExtras += 80000;
    if (quickForm.extras.transmisorExtra) subtotalExtras += 25000;
    if (quickForm.extras.iluminacion) subtotalExtras += 30000;
    if (quickForm.extras.dj) subtotalExtras += 100000;

    const subTotalBruto = subtotalAudifonos + subtotalCanales + subtotalExtras;
    const descPorcentaje = Number(quickForm.descuento) || 0;
    const descMonto = subTotalBruto * (descPorcentaje / 100);
    const subTotalNeto = subTotalBruto - descMonto;
    const ivaMonto = subTotalNeto * 0.19;
    const totalMonto = subTotalNeto + ivaMonto;

    return {
      subtotalAudifonos,
      subtotalCanales,
      subtotalExtras,
      subtotalBruto: subTotalBruto,
      descuentoMonto: descMonto,
      subtotalNeto: subTotalNeto,
      iva: ivaMonto,
      total: totalMonto
    };
  }, [quickForm]);

  // Helper para buscar un equipo en inventario de forma segura
  const getValidEquipoId = (keyword) => {
    const item = inventario.find(i => i.nombreEquipo.toLowerCase().includes(keyword.toLowerCase()));
    if (item) return item.idEquipo;
    if (inventario.length > 0) return inventario[0].idEquipo;
    return 'E-default';
  };

  // --- ENVIAR FORMULARIO RÁPIDO Y AUTOGENERAR ---
  const handleGenerateQuickCotizacion = async (e) => {
    e.preventDefault();
    if (!quickForm.encargado && !quickForm.empresa) {
      return addToast('Por favor, ingresa el Encargado o la Empresa.', 'warning');
    }
    if (!quickForm.correo) {
      return addToast('El correo es requerido para el perfil del cliente.', 'warning');
    }
    if (!quickForm.fechaEvento) {
      return addToast('La fecha del evento es requerida para validar stock.', 'warning');
    }

    setIsGenerating(true);
    try {
      // 1. Crear o actualizar el perfil del cliente
      let clientId = '';
      const existingClient = clientes.find(c => 
        (quickForm.correo && c.correo?.toLowerCase() === quickForm.correo.toLowerCase()) ||
        (quickForm.rut && c.id?.toLowerCase() === quickForm.rut.toLowerCase())
      );

      const parts = quickForm.encargado.trim().split(/\s+/);
      const nombre = parts[0] || 'Cliente';
      const apellido = parts.slice(1).join(' ') || '';

      const clientePayload = {
        nombre,
        apellido,
        correo: quickForm.correo,
        telefono: quickForm.telefono,
        direccionEmpresa: quickForm.direccionComercial || quickForm.direccionEvento,
        comuna: 'Santiago',
        pais: 'Chile',
        empresa: quickForm.empresa || `${nombre} ${apellido}`,
        cargo: 'Encargado',
        tipoEvento: 'Silent Disco'
      };

      if (existingClient) {
        await editCliente(existingClient.id, clientePayload);
        clientId = existingClient.id;
        addToast('Perfil del cliente existente actualizado.', 'info');
      } else {
        const newClient = await addCliente(clientePayload);
        if (!newClient || !newClient.id) {
          throw new Error('No se pudo obtener el ID del cliente registrado.');
        }
        clientId = newClient.id;
      }

      // 2. Crear el Servicio
      const fechaInicio = `${quickForm.fechaEvento}T${quickForm.horaInicio || '18:00'}`;
      const fechaFin = `${quickForm.fechaEvento}T${quickForm.horaFin || '23:59'}`;

      const servicioPayload = {
        clienteId: clientId,
        direccionEvento: quickForm.direccionEvento,
        fechaInicio,
        fechaFin,
      };

      const newService = await addServicio(servicioPayload);
      if (!newService || !newService.idServicio) {
        throw new Error('No se pudo obtener el ID del servicio generado.');
      }
      const idServicio = newService.idServicio;

      // 3. Obtener IDs de inventario reales para evitar fallos de llaves foráneas
      const audifonoId = getValidEquipoId('audifono');
      const transmisorId = getValidEquipoId('transmisor');

      // 4. Agregar items secuencialmente
      // Item A: Audífonos
      await addItemCotizacion({
        servicioId: idServicio,
        equipoId: audifonoId,
        descripcion: `${quickForm.cantidadAudifonos}x Audifonos EcoSilence (Arriendo)`,
        cantidad: Number(quickForm.cantidadAudifonos),
        dias: 1,
        precioUnitario: Number(quickForm.precioAudifono)
      });

      // Item B: Transmisor Multicanal si se seleccionaron más de 1 canal
      if (quickForm.canales > 1) {
        await addItemCotizacion({
          servicioId: idServicio,
          equipoId: transmisorId,
          descripcion: `Transmisor ${quickForm.canales} canales (UHF Multicanal)`,
          cantidad: 1,
          dias: 1,
          precioUnitario: 25000
        });
      }

      // Items Extras de la Matriz
      if (quickForm.extras.staff) {
        await addItemCotizacion({
          servicioId: idServicio,
          equipoId: getValidEquipoId('operador') || audifonoId,
          descripcion: 'Staff / Operador Técnico en Terreno',
          cantidad: 1,
          dias: 1,
          precioUnitario: 80000
        });
      }

      if (quickForm.extras.transmisorExtra) {
        await addItemCotizacion({
          servicioId: idServicio,
          equipoId: transmisorId,
          descripcion: 'Transmisor Adicional Extra',
          cantidad: 1,
          dias: 1,
          precioUnitario: 25000
        });
      }

      if (quickForm.extras.iluminacion) {
        await addItemCotizacion({
          servicioId: idServicio,
          equipoId: getValidEquipoId('iluminacion') || getValidEquipoId('luces') || audifonoId,
          descripcion: 'Equipo de Iluminación Perimetral LED',
          cantidad: 1,
          dias: 1,
          precioUnitario: 30000
        });
      }

      if (quickForm.extras.dj) {
        await addItemCotizacion({
          servicioId: idServicio,
          equipoId: getValidEquipoId('dj') || getValidEquipoId('cine') || audifonoId,
          descripcion: 'Servicio de DJ / Cine al aire libre',
          cantidad: 1,
          dias: 1,
          precioUnitario: 100000
        });
      }

      // 5. Aplicar descuento si aplica
      if (quickForm.descuento > 0) {
        await updateServiceDiscount(idServicio, quickForm.descuento);
      }

      // 6. Sincronizar final con calendario (addItemCotizacion ya lo hace, pero forzamos por seguridad)
      const updatedCots = cotizaciones.filter(c => c.servicioId === idServicio);
      await handleCalendarSync(newService, updatedCots);

      addToast('¡Cotización e ID de servicio creados con éxito! Stock reservado.', 'success');

      // Limpiar formulario y redireccionar
      setWhatsappText('');
      setQuickForm({
        empresa: '', rut: '', encargado: '', telefono: '', correo: '',
        direccionComercial: '', direccionEvento: '', fechaEvento: '',
        horaInicio: '18:00', horaFin: '23:59', cantidadAudifonos: 50,
        canales: 3, extras: { staff: false, transmisorExtra: false, iluminacion: false, dj: false },
        descuento: 0, precioAudifono: 5000
      });

      setSelectedServicioId(idServicio);
      setActiveTab('manual');
    } catch (err) {
      console.error('Error al generar la cotización rápida:', err);
      addToast('Error al autogenerar la cotización: ' + err.message, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '2rem' }}>
      {/* ESTILOS CRÍTICOS PARA IMPRESIÓN */}
      <style>{`
        @media print {
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
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          @page {
            size: A4;
            margin: 5mm;
          }
        }
      `}</style>

      <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            className="btn btn-ghost"
            style={{ padding: '0.5rem 1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)' }}
            onClick={() => navigate(viewParams?.from || 'kanban', viewParams)}
          >
            <ArrowLeft size={18} /> Volver
          </button>
          <div>
            <h1 style={{ margin: 0, marginBottom: '0.3rem' }}>{menuNames.cotizaciones || 'Cotización y Facturación'}</h1>
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>Crea y gestiona presupuestos enlazados a tus servicios y eventos.</p>
          </div>
        </div>

        {/* Sistema de Pestañas (Tabs) */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', gap: '0.5rem', marginTop: '0.5rem' }}>
          <button
            className="btn"
            onClick={() => setActiveTab('manual')}
            style={{
              background: activeTab === 'manual' ? 'rgba(255, 255, 255, 0.04)' : 'transparent',
              color: activeTab === 'manual' ? 'var(--accent-primary)' : 'var(--text-muted)',
              borderBottom: activeTab === 'manual' ? '3px solid var(--accent-primary)' : '3px solid transparent',
              borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
              padding: '0.8rem 1.5rem',
              fontWeight: 600,
              fontSize: '0.95rem',
              borderLeft: 'none',
              borderRight: 'none',
              borderTop: 'none',
            }}
          >
            <FileText size={16} /> Gestor de Presupuestos
          </button>
          <button
            className="btn"
            onClick={() => setActiveTab('rapida')}
            style={{
              background: activeTab === 'rapida' ? 'rgba(255, 255, 255, 0.04)' : 'transparent',
              color: activeTab === 'rapida' ? 'var(--accent-primary)' : 'var(--text-muted)',
              borderBottom: activeTab === 'rapida' ? '3px solid var(--accent-primary)' : '3px solid transparent',
              borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
              padding: '0.8rem 1.5rem',
              fontWeight: 600,
              fontSize: '0.95rem',
              borderLeft: 'none',
              borderRight: 'none',
              borderTop: 'none',
            }}
          >
            <Zap size={16} /> Captura Rápida & IA (WhatsApp)
          </button>
        </div>

        {activeTab === 'manual' ? (
          <>
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
                      return <option key={s.idServicio} value={s.idServicio}>{s.idServicio} - {cli?.nombre} {cli?.empresa ? `(${cli?.empresa})` : ''} - {formatDateDDMMYYYY(s.fechaInicio).split(' ')[0]}</option>
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
                        <p style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem' }}><MapPin size={14} /> {servicio.direccionEvento}</p>
                      </div>
                      <div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.2rem' }}>Fechas</p>
                        <p style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem' }}><CalendarDays size={14} /> {formatDateDDMMYYYY(servicio.fechaInicio)}</p>
                      </div>
                    </div>

                    {/* Tabla de items */}
                    <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                            <th style={{ padding: '0.8rem 0', width: '60px', textAlign: 'center' }} className="no-print">Pos.</th>
                            <th style={{ padding: '0.8rem 0' }}>Descripción</th>
                            <th style={{ padding: '0.8rem 0', textAlign: 'center' }}>Cant.</th>
                            <th style={{ padding: '0.8rem 0', textAlign: 'center' }}>Días</th>
                            <th style={{ padding: '0.8rem 0', textAlign: 'right' }}>P.Unitario</th>
                            <th style={{ padding: '0.8rem 0', textAlign: 'right' }}>Subtotal</th>
                            <th style={{ padding: '0.8rem 0' }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {itemsCotizacion.map((item, index) => (
                            <tr key={item.idCotizacion} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                              <td style={{ padding: '0.5rem 0', textAlign: 'center' }} className="no-print">
                                <div style={{ display: 'flex', gap: '0.2rem', justifyContent: 'center', alignItems: 'center' }}>
                                  <button
                                    onClick={() => handleMoveUp(index)}
                                    disabled={index === 0}
                                    style={{
                                      background: 'rgba(255,255,255,0.05)',
                                      border: '1px solid rgba(255,255,255,0.1)',
                                      borderRadius: '4px',
                                      color: index === 0 ? 'var(--text-muted)' : 'var(--text-main)',
                                      opacity: index === 0 ? 0.3 : 1,
                                      cursor: index === 0 ? 'default' : 'pointer',
                                      padding: '4px',
                                      display: 'flex',
                                      alignItems: 'center'
                                    }}
                                    title="Subir ítem"
                                  >
                                    <ArrowUp size={12} />
                                  </button>
                                  <button
                                    onClick={() => handleMoveDown(index)}
                                    disabled={index === itemsCotizacion.length - 1}
                                    style={{
                                      background: 'rgba(255,255,255,0.05)',
                                      border: '1px solid rgba(255,255,255,0.1)',
                                      borderRadius: '4px',
                                      color: index === itemsCotizacion.length - 1 ? 'var(--text-muted)' : 'var(--text-main)',
                                      opacity: index === itemsCotizacion.length - 1 ? 0.3 : 1,
                                      cursor: index === itemsCotizacion.length - 1 ? 'default' : 'pointer',
                                      padding: '4px',
                                      display: 'flex',
                                      alignItems: 'center'
                                    }}
                                    title="Bajar ítem"
                                  >
                                    <ArrowDown size={12} />
                                  </button>
                                </div>
                              </td>
                              <td style={{ padding: '1rem 0' }}>
                                <div style={{ fontWeight: 500 }}>{item.descripcion}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{inventario.find(i => i.idEquipo === item.equipoId)?.categoria}</div>
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
                              <td style={{ padding: '1rem 0', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(item.subtotal, servicio?.moneda)}</td>
                              <td style={{ padding: '1rem 0', textAlign: 'right' }}>
                                <button onClick={() => removeItemCotizacion(item.idCotizacion)} style={{ background: 'none', border: 'none', color: 'var(--color-tomato)', cursor: 'pointer' }}><Trash2 size={16} /></button>
                              </td>
                            </tr>
                          ))}
                          {itemsCotizacion.length === 0 && (
                            <tr><td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Sin ítems en el presupuesto.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Totales */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem', borderTop: '2px solid var(--border-color)', paddingTop: '1.5rem' }}>
                      <div style={{ width: '250px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--text-main)' }}>
                          <span>Subtotal:</span> <span>{formatCurrency(totales.subtotalBruto, servicio?.moneda)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'center' }}>
                          <span style={{ color: 'var(--color-banana)' }}>Descuento (%):</span>
                          <input type="number" min="0" max="100" className="input-control" style={{ width: '80px', padding: '0.3rem', textAlign: 'right' }} value={servicio?.descuento || 0} onChange={(e) => updateServiceDiscount(servicio.idServicio, e.target.value)} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', color: 'var(--text-muted)' }}>
                          <span>IVA (19%):</span> <span>{formatCurrency(totales.iva, servicio?.moneda)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                          <span>Total {servicio?.moneda || 'CLP'}:</span> <span>{formatCurrency(totales.total, servicio?.moneda)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Acciones Finales */}
                    <div className="no-print" style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                      <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => addToast('Cotización guardada exitosamente y sincronizada en el flujo de trabajo.', 'success')}><Save size={18} /> Guardar Cotización (Soft)</button>
                      <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setShowPreview(true)}><Download size={18} /> Generar PDF (Voucher)</button>
                    </div>
                  </div>
                </div>

                {/* Panel Lateral: Agregar Items */}
                <div style={{ flex: '1 1 300px' }}>
                  <div className="glass-panel" style={{ padding: '1.5rem', position: 'sticky', top: '20px' }}>
                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Box size={18} /> Añadir Equipamiento
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
                        <input required type="text" className="input-control" value={formData.descripcion} onChange={e => setFormData({ ...formData, descripcion: e.target.value })} />
                      </div>

                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <div className="input-group" style={{ flex: 1, margin: 0 }}>
                          <label className="input-label">Cantidad</label>
                          <input required type="number" min="1" className="input-control" value={formData.cantidad} onChange={e => setFormData({ ...formData, cantidad: e.target.value })} />
                        </div>
                        <div className="input-group" style={{ flex: 1, margin: 0 }}>
                          <label className="input-label">Días de Arriendo</label>
                          <input required type="number" min="1" className="input-control" value={formData.dias} onChange={e => setFormData({ ...formData, dias: e.target.value })} />
                        </div>
                      </div>

                      <div className="input-group" style={{ margin: 0 }}>
                        <label className="input-label">Precio Unitario ({servicio?.moneda || 'CLP'})</label>
                        <input required type="number" min="0" step="any" className="input-control" value={formData.precioUnitario} onChange={e => setFormData({ ...formData, precioUnitario: e.target.value })} />
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
          </>
        ) : (
          /* pestañas de captura rápida & ia */
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            
            {/* Panel Izquierdo: WhatsApp Parser */}
            <div style={{ flex: '1 1 350px', minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="glass-card" style={{ padding: '1.5rem' }}>
                <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--accent-primary)' }}>
                  <Sparkles size={20} /> Pegar desde WhatsApp
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  Pega aquí el mensaje del cliente con las condiciones, fecha o cantidad de equipos. Nuestra IA extraerá los datos para autocompletar el formulario.
                </p>
                <textarea
                  className="input-control"
                  style={{ width: '100%', minHeight: '180px', fontFamily: 'inherit', resize: 'vertical', background: 'rgba(0,0,0,0.3)', marginBottom: '1.2rem', fontSize: '0.9rem' }}
                  placeholder="Ej: Hola Camilo, soy Marcelo de Mall Sport. Necesitamos cotizar 80 audífonos y 3 canales para el sábado 15 de agosto. El evento es en Av las condes 13.451 de 18:00 a 23:59. Mi correo es marcelo@mallsport.cl y fono +56998765432..."
                  value={whatsappText}
                  onChange={(e) => setWhatsappText(e.target.value)}
                  disabled={isAnalyzing || isGenerating}
                />
                
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '0.75rem', fontWeight: 600 }}
                  onClick={handleIAAnalysis}
                  disabled={isAnalyzing || isGenerating || !whatsappText.trim()}
                >
                  {isAnalyzing ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="animate-spin" style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%' }}></span>
                      Procesando con IA...
                    </span>
                  ) : (
                    <>
                      <Zap size={16} /> Analizar con IA
                    </>
                  )}
                </button>
              </div>

              {/* Logs de la IA (Visual Feedback) */}
              {(isAnalyzing || analysisLogs.length > 0) && (
                <div className="glass-panel" style={{ padding: '1.2rem', fontSize: '0.85rem', minHeight: '130px', background: 'rgba(0,0,0,0.1)' }}>
                  <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.8rem', letterSpacing: '0.05em' }}>
                    Progreso del Análisis IA
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontFamily: 'monospace' }}>
                    {analysisLogs.map((log, idx) => (
                      <div key={idx} style={{ 
                        color: log.includes('¡Completado!') ? 'var(--color-basil)' : (log.includes('Error') ? 'var(--color-tomato)' : 'var(--text-main)'),
                        animation: 'fadeIn 0.2s ease-out forwards',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                      }}>
                        {log.includes('¡Completado!') ? '✓' : '•'} {log}
                      </div>
                    ))}
                    {isAnalyzing && (
                      <div style={{ display: 'flex', gap: '0.2rem', margin: '0.2rem 0 0 0.8rem' }}>
                        <span className="animate-bounce" style={{ width: '4px', height: '4px', background: 'var(--accent-primary)', borderRadius: '50%', display: 'inline-block' }}></span>
                        <span className="animate-bounce" style={{ width: '4px', height: '4px', background: 'var(--accent-primary)', borderRadius: '50%', display: 'inline-block', animationDelay: '0.2s' }}></span>
                        <span className="animate-bounce" style={{ width: '4px', height: '4px', background: 'var(--accent-primary)', borderRadius: '50%', display: 'inline-block', animationDelay: '0.4s' }}></span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Panel Derecho: Formulario Structured & Live pricing */}
            <div style={{ flex: '2 1 450px', minWidth: '320px' }}>
              <form onSubmit={handleGenerateQuickCotizacion} className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.8rem' }}>
                <h2 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ClipboardCheck size={24} color="var(--accent-primary)" /> Datos del Nuevo Arriendo
                </h2>

                {/* Sección A: Datos de Contacto */}
                <div>
                  <h4 style={{ color: 'var(--accent-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.95rem' }}>
                    <User size={16} /> A) Datos de Contacto del Cliente
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', flexWrap: 'wrap' }}>
                    <div className="input-group" style={{ margin: 0 }}>
                      <label className="input-label">Nombre Empresa / Cliente</label>
                      <input
                        required
                        type="text"
                        className="input-control"
                        placeholder="Ej. Mall Sport"
                        value={quickForm.empresa}
                        onChange={(e) => setQuickForm({ ...quickForm, empresa: e.target.value })}
                        disabled={isGenerating}
                      />
                    </div>
                    <div className="input-group" style={{ margin: 0 }}>
                      <label className="input-label">RUT / ID Tributario</label>
                      <input
                        type="text"
                        className="input-control"
                        placeholder="Ej. 77.510.784-7"
                        value={quickForm.rut}
                        onChange={(e) => setQuickForm({ ...quickForm, rut: e.target.value })}
                        disabled={isGenerating}
                      />
                    </div>
                    <div className="input-group" style={{ margin: 0 }}>
                      <label className="input-label">Nombre Encargado</label>
                      <input
                        required
                        type="text"
                        className="input-control"
                        placeholder="Ej. Camilo Collante"
                        value={quickForm.encargado}
                        onChange={(e) => setQuickForm({ ...quickForm, encargado: e.target.value })}
                        disabled={isGenerating}
                      />
                    </div>
                    <div className="input-group" style={{ margin: 0 }}>
                      <label className="input-label">Teléfono</label>
                      <input
                        type="text"
                        className="input-control"
                        placeholder="Ej. +56953799875"
                        value={quickForm.telefono}
                        onChange={(e) => setQuickForm({ ...quickForm, telefono: e.target.value })}
                        disabled={isGenerating}
                      />
                    </div>
                    <div className="input-group" style={{ gridColumn: 'span 2', margin: 0 }}>
                      <label className="input-label">Correo Electrónico</label>
                      <input
                        required
                        type="email"
                        className="input-control"
                        placeholder="Ej. info@ecosilence.cl"
                        value={quickForm.correo}
                        onChange={(e) => setQuickForm({ ...quickForm, correo: e.target.value })}
                        disabled={isGenerating}
                      />
                    </div>
                  </div>
                </div>

                {/* Sección B: Logística y Fechas */}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                  <h4 style={{ color: 'var(--accent-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.95rem' }}>
                    <MapPin size={16} /> B) Logística & Fechas
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div className="input-group" style={{ margin: 0 }}>
                        <label className="input-label">Dirección Comercial Facturación</label>
                        <input
                          type="text"
                          className="input-control"
                          placeholder="Dirección fiscal..."
                          value={quickForm.direccionComercial}
                          onChange={(e) => setQuickForm({ ...quickForm, direccionComercial: e.target.value })}
                          disabled={isGenerating}
                        />
                      </div>
                      <div className="input-group" style={{ margin: 0 }}>
                        <label className="input-label">Dirección del Evento</label>
                        <input
                          required
                          type="text"
                          className="input-control"
                          placeholder="Lugar del montaje..."
                          value={quickForm.direccionEvento}
                          onChange={(e) => setQuickForm({ ...quickForm, direccionEvento: e.target.value })}
                          disabled={isGenerating}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem' }}>
                      <div className="input-group" style={{ margin: 0 }}>
                        <label className="input-label">Fecha del Evento</label>
                        <input
                          required
                          type="date"
                          className="input-control"
                          value={quickForm.fechaEvento}
                          onChange={(e) => setQuickForm({ ...quickForm, fechaEvento: e.target.value })}
                          disabled={isGenerating}
                        />
                      </div>
                      <div className="input-group" style={{ margin: 0 }}>
                        <label className="input-label">Hora Inicio</label>
                        <input
                          required
                          type="time"
                          className="input-control"
                          value={quickForm.horaInicio}
                          onChange={(e) => setQuickForm({ ...quickForm, horaInicio: e.target.value })}
                          disabled={isGenerating}
                        />
                      </div>
                      <div className="input-group" style={{ margin: 0 }}>
                        <label className="input-label">Hora Término</label>
                        <input
                          required
                          type="time"
                          className="input-control"
                          value={quickForm.horaFin}
                          onChange={(e) => setQuickForm({ ...quickForm, horaFin: e.target.value })}
                          disabled={isGenerating}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sección C: Configuración Técnica e Ítems Extra */}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                  <h4 style={{ color: 'var(--accent-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.95rem' }}>
                    <Layers size={16} /> C) Configuración Técnica & Extras
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                    
                    {/* Selector de cantidad y precio */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div className="input-group" style={{ margin: 0 }}>
                        <label className="input-label">Cantidad de Audífonos</label>
                        <input
                          required
                          type="number"
                          min="1"
                          className="input-control"
                          value={quickForm.cantidadAudifonos}
                          onChange={(e) => setQuickForm({ ...quickForm, cantidadAudifonos: e.target.value })}
                          disabled={isGenerating}
                        />
                      </div>
                      <div className="input-group" style={{ margin: 0 }}>
                        <label className="input-label">Precio Unitario Arriendo ($/unidad)</label>
                        <input
                          required
                          type="number"
                          min="0"
                          className="input-control"
                          value={quickForm.precioAudifono}
                          onChange={(e) => setQuickForm({ ...quickForm, precioAudifono: e.target.value })}
                          disabled={isGenerating}
                        />
                      </div>
                    </div>

                    {/* Selector de Ambientes/Canales */}
                    <div className="input-group" style={{ margin: 0 }}>
                      <label className="input-label" style={{ marginBottom: '0.4rem' }}>Ambientes / Canales UHF</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem' }}>
                        {[1, 2, 3].map((ch) => (
                          <div
                            key={ch}
                            onClick={() => !isGenerating && setQuickForm({ ...quickForm, canales: ch })}
                            style={{
                              padding: '0.6rem',
                              textAlign: 'center',
                              borderRadius: 'var(--radius-sm)',
                              border: quickForm.canales === ch ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                              background: quickForm.canales === ch ? 'rgba(99,102,241,0.1)' : 'rgba(0,0,0,0.2)',
                              color: quickForm.canales === ch ? 'var(--accent-primary)' : 'var(--text-muted)',
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'var(--transition)'
                            }}
                          >
                            {ch} Canal{ch > 1 ? 'es' : ''} {ch > 1 ? '📡' : '📻'}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Matriz de Extras */}
                    <div className="input-group" style={{ margin: 0 }}>
                      <label className="input-label" style={{ marginBottom: '0.4rem' }}>Matriz de Equipos y Servicios Adicionales</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)' }}
                            checked={quickForm.extras.staff}
                            onChange={(e) => setQuickForm({ ...quickForm, extras: { ...quickForm.extras, staff: e.target.checked } })}
                            disabled={isGenerating}
                          />
                          <div style={{ fontSize: '0.85rem' }}>
                            <strong>Staff Técnico</strong>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>+ $80.000 (Operador en Terreno)</div>
                          </div>
                        </label>
                        
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)' }}
                            checked={quickForm.extras.transmisorExtra}
                            onChange={(e) => setQuickForm({ ...quickForm, extras: { ...quickForm.extras, transmisorExtra: e.target.checked } })}
                            disabled={isGenerating}
                          />
                          <div style={{ fontSize: '0.85rem' }}>
                            <strong>Transmisor Extra</strong>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>+ $25.000 (Arriendo Adicional)</div>
                          </div>
                        </label>
                        
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)' }}
                            checked={quickForm.extras.iluminacion}
                            onChange={(e) => setQuickForm({ ...quickForm, extras: { ...quickForm.extras, iluminacion: e.target.checked } })}
                            disabled={isGenerating}
                          />
                          <div style={{ fontSize: '0.85rem' }}>
                            <strong>Iluminación LED</strong>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>+ $30.000 (Ambiental perimetral)</div>
                          </div>
                        </label>

                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)' }}
                            checked={quickForm.extras.dj}
                            onChange={(e) => setQuickForm({ ...quickForm, extras: { ...quickForm.extras, dj: e.target.checked } })}
                            disabled={isGenerating}
                          />
                          <div style={{ fontSize: '0.85rem' }}>
                            <strong>DJ / Cine al aire libre</strong>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>+ $100.000 (Servicio Completo)</div>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cálculo Dinámico de Precios Estimados & Generar */}
                <div style={{ borderTop: '2px dashed var(--border-color)', paddingTop: '1.5rem', background: 'rgba(99,102,241,0.02)', padding: '1.2rem', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ flex: '1 1 200px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.3rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Subtotal Estimado:</span>
                        <span>{formatCurrency(quickEstimates.subtotalBruto)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.3rem', alignItems: 'center' }}>
                        <span style={{ color: 'var(--color-banana)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}><Percent size={14} /> Descuento (%):</span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          className="input-control"
                          style={{ width: '60px', padding: '0.2rem', textAlign: 'right', background: 'transparent' }}
                          value={quickForm.descuento}
                          onChange={(e) => setQuickForm({ ...quickForm, descuento: e.target.value })}
                          disabled={isGenerating}
                        />
                      </div>
                      {quickEstimates.descuentoMonto > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--color-tomato)', marginBottom: '0.3rem' }}>
                          <span>Ahorro Descuento:</span>
                          <span>- {formatCurrency(quickEstimates.descuentoMonto)}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                        <span>IVA (19%):</span>
                        <span>{formatCurrency(quickEstimates.iva)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                        <span>Total Neto + IVA:</span>
                        <span>{formatCurrency(quickEstimates.total)}</span>
                      </div>
                    </div>

                    <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <button
                        type="submit"
                        className="btn btn-primary animate-fade-in"
                        style={{ width: '100%', padding: '1rem', fontSize: '1rem', fontWeight: 700 }}
                        disabled={isGenerating || isAnalyzing}
                      >
                        {isGenerating ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                            <span className="animate-spin" style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%' }}></span>
                            Sincronizando...
                          </span>
                        ) : (
                          <>
                            <PlusCircle size={20} /> Generar Cotización
                          </>
                        )}
                      </button>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>
                        Crea el cliente, reserva stock en calendario y te redirige para revisión PDF.
                      </p>
                    </div>
                  </div>
                </div>
              </form>
            </div>
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
• El arriendo es por Jornada completa 

Estamos a tu disposición para cualquier duda que tengas.

Camilo Collante.
EcoSilence Spa.
+56 9 5379 9875
Pintor Laureano Guevara 60, La Reina.

https://www.ecosilence.cl/
https://www.youtube.com/watch?v=M5Hv5z5rWaA`);
                  window.location.href = `mailto:${cliente.correo}?cc=info@ecosilence.cl&subject=${subject}&body=${body}`;
                }}>
                  <Mail size={18} /> Enviar por Correo
                </button>
                <button className="btn btn-primary" onClick={() => window.print()}>
                  <Printer size={18} /> Imprimir / Guardar PDF
                </button>
                <button className="btn btn-ghost" onClick={() => setShowPreview(false)} style={{ border: 'none', padding: '0.4rem' }}>
                  <X size={20} />
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
                  <p style={{ margin: 0, fontSize: '0.8rem' }}><strong>Vence:</strong> {new Date(new Date().getTime() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString('es-CL')}</p>
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
                  <p style={{ fontSize: '0.9rem', margin: '0 0 0.4rem 0', color: '#334155' }}><strong>Fecha Evento:</strong> {formatDateDDMMYYYY(servicio.fechaInicio)}</p>
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
                      <td style={{ padding: '0.8rem 1rem', textAlign: 'right', color: '#334155', border: '1px solid #e2e8f0' }}>{formatCurrency(item.precioUnitario, servicio?.moneda)}</td>
                      <td style={{ padding: '0.8rem 1rem', textAlign: 'right', fontWeight: 700, color: '#0f172a', border: '1px solid #e2e8f0' }}>{formatCurrency(item.subtotal, servicio?.moneda)}</td>
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
                    <span style={{ fontWeight: 600 }}>{formatCurrency(totales.subtotalBruto, servicio?.moneda)}</span>
                  </div>
                  {totales.descuentoPorcentaje > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', color: '#ef4444', borderBottom: '1px solid #fee2e2' }}>
                      <span>Descuento ({totales.descuentoPorcentaje}%):</span>
                      <span style={{ fontWeight: 600 }}>- {formatCurrency(totales.descuentoMonto, servicio?.moneda)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ color: '#64748b' }}>IVA (19%):</span>
                    <span style={{ fontWeight: 600 }}>{formatCurrency(totales.iva, servicio?.moneda)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0.5rem', background: '#4f46e5', color: 'white', borderRadius: '4px', marginTop: '1rem', fontSize: '1.3rem', fontWeight: 800, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                    <span>Total General:</span>
                    <span>{formatCurrency(totales.total, servicio?.moneda)}</span>
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
