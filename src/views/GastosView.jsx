import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useToast } from '../context/ToastContext';
import {
  Plus,
  ScanLine,
  Camera,
  FileSpreadsheet,
  Search,
  Filter,
  Trash2,
  Edit2,
  Eye,
  X,
  Receipt,
  CheckCircle2,
  Sparkles,
  Calendar,
  Building2,
  Tag,
  DollarSign,
  Download,
  AlertTriangle,
  RotateCcw,
  Home
} from 'lucide-react';
import {
  EXPENSE_DOC_TYPES,
  EXPENSE_CATEGORIES_EMPRESA,
  EXPENSE_CATEGORIES_CASA,
  scanReceiptWithAI,
  compressReceiptImage,
  calculateTaxBreakdown,
  classifyCategoryFromText,
  classifyCasaCategoryFromText
} from '../services/receiptScannerService';
import {
  fetchCentralizedExpenses,
  saveCentralizedExpense,
  deleteCentralizedExpense,
  subscribeToExpensesRealtime,
  getStorageKey
} from '../services/expensesService';

const getEmptyForm = (entidad = 'empresa') => ({
  fecha: new Date().toISOString().split('T')[0],
  tipoDocumento: 'Boleta Electrónica',
  rutEmisor: '',
  razonSocial: '',
  categoria: entidad === 'casa' ? 'Supermercado / Abarrotes' : 'Otros Gastos',
  descripcion: '',
  total: '',
  neto: '',
  iva: '',
  comprobanteImg: '',
  nombreArchivo: ''
});

const GastosView = ({ entidad = 'empresa', filterPeriod = null }) => {
  const { addToast } = useToast();
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const storageKey = getStorageKey(entidad);

  // Inicializa con cache local para render instantáneo, y luego sincroniza con Supabase
  const [gastos, setGastos] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isLoadingGastos, setIsLoadingGastos] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Carga y sincronización reactiva con Supabase (en PC, móvil y multiusuario)
  const loadExpenses = async (showLoading = false) => {
    if (showLoading) setIsLoadingGastos(true);
    try {
      const remoteData = await fetchCentralizedExpenses(entidad);
      setGastos(remoteData);
    } catch (err) {
      console.error(`Error sincronizando gastos (${entidad}) con Supabase:`, err);
    } finally {
      if (showLoading) setIsLoadingGastos(false);
    }
  };

  useEffect(() => {
    // Si cambia de entidad (empresa <-> casa), recargar cache y datos frescos
    try {
      const cached = localStorage.getItem(getStorageKey(entidad));
      if (cached) setGastos(JSON.parse(cached));
      else setGastos([]);
    } catch {
      setGastos([]);
    }

    loadExpenses(true);

    // Suscripción en Tiempo Real con Supabase Realtime para la entidad actual
    const unsubscribe = subscribeToExpensesRealtime(() => {
      loadExpenses(false);
    }, entidad);

    return () => {
      unsubscribe();
    };
  }, [entidad]);

  // Filtros de Auditoría y Búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [selectedDocType, setSelectedDocType] = useState('Todos');
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');

  // Sincronizar filtro si se recibe desde el menú lateral (ej. { year: 2026, month: '05' })
  useEffect(() => {
    if (!filterPeriod) return;
    if (filterPeriod.year && filterPeriod.month) {
      const y = filterPeriod.year;
      const m = String(filterPeriod.month).padStart(2, '0');
      const lastDayNum = new Date(Number(y), parseInt(m, 10), 0).getDate();
      const lastDay = String(lastDayNum).padStart(2, '0');
      setCustomDateFrom(`${y}-${m}-01`);
      setCustomDateTo(`${y}-${m}-${lastDay}`);
      setSelectedPeriod('custom');
    } else if (filterPeriod.year) {
      setSelectedPeriod(`year_${filterPeriod.year}`);
      setCustomDateFrom('');
      setCustomDateTo('');
    }
  }, [filterPeriod]);

  // Nombres de meses en español para los periodos
  const SPANISH_MONTH_NAMES = useMemo(
    () => [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ],
    []
  );

  const now = new Date();
  const currentMonthIdx = now.getMonth();
  const currentYearNum = now.getFullYear();
  const currentMonthLabel = `${SPANISH_MONTH_NAMES[currentMonthIdx]} ${currentYearNum}`;

  const prevMonthDate = new Date(currentYearNum, currentMonthIdx - 1, 1);
  const prevMonthIdx = prevMonthDate.getMonth();
  const prevMonthYearNum = prevMonthDate.getFullYear();
  const prevMonthLabel = `${SPANISH_MONTH_NAMES[prevMonthIdx]} ${prevMonthYearNum}`;

  // Años dinámicos presentes en los gastos registrados + año actual
  const availableYears = useMemo(() => {
    const yearsSet = new Set([currentYearNum]);
    (gastos || []).forEach((g) => {
      const match = String(g.fecha || '').match(/^(\d{4})/);
      if (match) {
        const y = parseInt(match[1], 10);
        if (y >= 2020 && y <= 2035) {
          yearsSet.add(y);
        }
      }
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [gastos, currentYearNum]);

  // Cálculo del rango activo según el periodo seleccionado
  const activeDateRange = useMemo(() => {
    const pad = (n) => String(n).padStart(2, '0');

    if (selectedPeriod === 'this_month') {
      const firstDay = `${currentYearNum}-${pad(currentMonthIdx + 1)}-01`;
      const lastDayNum = new Date(currentYearNum, currentMonthIdx + 1, 0).getDate();
      const lastDay = `${currentYearNum}-${pad(currentMonthIdx + 1)}-${pad(lastDayNum)}`;
      return {
        from: firstDay,
        to: lastDay,
        label: `Este Mes (${currentMonthLabel})`,
        fileSuffix: `${SPANISH_MONTH_NAMES[currentMonthIdx]}_${currentYearNum}`
      };
    }

    if (selectedPeriod === 'last_month') {
      const firstDay = `${prevMonthYearNum}-${pad(prevMonthIdx + 1)}-01`;
      const lastDayNum = new Date(prevMonthYearNum, prevMonthIdx + 1, 0).getDate();
      const lastDay = `${prevMonthYearNum}-${pad(prevMonthIdx + 1)}-${pad(lastDayNum)}`;
      return {
        from: firstDay,
        to: lastDay,
        label: `Mes Anterior (${prevMonthLabel})`,
        fileSuffix: `${SPANISH_MONTH_NAMES[prevMonthIdx]}_${prevMonthYearNum}`
      };
    }

    if (selectedPeriod.startsWith('year_')) {
      const y = selectedPeriod.replace('year_', '');
      return {
        from: `${y}-01-01`,
        to: `${y}-12-31`,
        label: `Año ${y}`,
        fileSuffix: `Ano_${y}`
      };
    }

    if (selectedPeriod === 'custom') {
      let label = 'Rango Personalizado';
      if (customDateFrom && customDateTo) {
        label = `${customDateFrom} al ${customDateTo}`;
      } else if (customDateFrom) {
        label = `Desde ${customDateFrom}`;
      } else if (customDateTo) {
        label = `Hasta ${customDateTo}`;
      }
      return {
        from: customDateFrom || null,
        to: customDateTo || null,
        label,
        fileSuffix:
          customDateFrom && customDateTo
            ? `${customDateFrom}_a_${customDateTo}`
            : 'Rango_Personalizado'
      };
    }

    return {
      from: null,
      to: null,
      label: 'Todo el Historial',
      fileSuffix: 'Todo_Historial'
    };
  }, [
    selectedPeriod,
    customDateFrom,
    customDateTo,
    currentYearNum,
    currentMonthIdx,
    currentMonthLabel,
    prevMonthYearNum,
    prevMonthIdx,
    prevMonthLabel,
    SPANISH_MONTH_NAMES
  ]);

  const isFilterActive = useMemo(() => {
    return (
      selectedPeriod !== 'all' ||
      Boolean(customDateFrom) ||
      Boolean(customDateTo) ||
      selectedCategory !== 'Todas' ||
      selectedDocType !== 'Todos' ||
      searchTerm.trim().length > 0
    );
  }, [selectedPeriod, customDateFrom, customDateTo, selectedCategory, selectedDocType, searchTerm]);

  const handleClearFilters = () => {
    setSelectedPeriod('all');
    setCustomDateFrom('');
    setCustomDateTo('');
    setSelectedCategory('Todas');
    setSelectedDocType('Todos');
    setSearchTerm('');
  };

  // Estados del Modal "+ Registrar Nuevo Gasto"
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(() => getEmptyForm(entidad));
  const [isScanning, setIsScanning] = useState(false);
  const [scanProviderBadge, setScanProviderBadge] = useState('');
  const [scanError, setScanError] = useState('');

  // Modal de previsualización de comprobante
  const [previewExpense, setPreviewExpense] = useState(null);

  const formatCurrency = (val) => {
    try {
      return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        maximumFractionDigits: 0
      }).format(Math.round(Number(val) || 0));
    } catch {
      return '$0';
    }
  };

  const baseCategories = useMemo(() => {
    return entidad === 'casa' ? EXPENSE_CATEGORIES_CASA : EXPENSE_CATEGORIES_EMPRESA;
  }, [entidad]);

  const availableCategories = useMemo(() => {
    const set = new Set(baseCategories);
    (gastos || []).forEach((g) => {
      if (g.categoria) set.add(g.categoria);
    });
    if (formData.categoria) set.add(formData.categoria);
    return Array.from(set);
  }, [gastos, formData.categoria, baseCategories]);

  const availableDocTypes = useMemo(() => {
    const set = new Set(EXPENSE_DOC_TYPES);
    (gastos || []).forEach((g) => {
      const dt = g.tipoDocumento || g.tipo_doc;
      if (dt) set.add(dt);
    });
    if (formData.tipoDocumento) set.add(formData.tipoDocumento);
    return Array.from(set);
  }, [gastos, formData.tipoDocumento]);

  const filteredGastos = useMemo(() => {
    return (gastos || [])
      .filter((g) => {
        // Filtro por Fecha (Desde / Hasta inclusivo)
        if (activeDateRange.from && g.fecha && g.fecha < activeDateRange.from) return false;
        if (activeDateRange.to && g.fecha && g.fecha > activeDateRange.to) return false;

        // Filtro por Categoría
        if (selectedCategory !== 'Todas' && g.categoria !== selectedCategory) return false;

        // Filtro por Tipo de Documento
        const dt = g.tipoDocumento || g.tipo_doc;
        if (selectedDocType !== 'Todos' && dt !== selectedDocType) return false;

        // Buscador reactivo por comercio, RUT o glosa
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const desc = String(g.descripcion || '').toLowerCase();
          const razon = String(g.razonSocial || g.proveedor || '').toLowerCase();
          const rut = String(g.rutEmisor || g.rut || '').toLowerCase();
          const cat = String(g.categoria || '').toLowerCase();
          return desc.includes(q) || razon.includes(q) || rut.includes(q) || cat.includes(q);
        }
        return true;
      })
      .sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));
  }, [gastos, selectedCategory, selectedDocType, searchTerm, activeDateRange]);

  const kpis = useMemo(() => {
    let totalBruto = 0;
    let totalNeto = 0;
    let totalIva = 0;
    let ivaCreditoFiscal = 0;
    let facturasCount = 0;
    const categoryTotals = {};

    filteredGastos.forEach((g) => {
      const t = Number(g.total ?? g.total_bruto) || 0;
      const n = Number(g.neto) || 0;
      const i = Number(g.iva) || 0;
      totalBruto += t;
      totalNeto += n;
      totalIva += i;

      const cat = g.categoria || (entidad === 'casa' ? 'Otros Hogar' : 'Otros Gastos');
      categoryTotals[cat] = (categoryTotals[cat] || 0) + t;

      const dt = String(g.tipoDocumento || g.tipo_doc || '');
      if (dt.toLowerCase().includes('factura')) {
        facturasCount++;
        ivaCreditoFiscal += i;
      }
    });

    let topCategory = 'Sin gastos';
    let topCategoryAmount = 0;
    Object.entries(categoryTotals).forEach(([cat, amt]) => {
      if (amt > topCategoryAmount) {
        topCategoryAmount = amt;
        topCategory = cat;
      }
    });

    const topCategoryPercent = totalBruto > 0 ? Math.round((topCategoryAmount / totalBruto) * 100) : 0;
    const promedioGasto = filteredGastos.length > 0 ? Math.round(totalBruto / filteredGastos.length) : 0;

    return {
      totalBruto,
      totalNeto,
      totalIva,
      ivaCreditoFiscal,
      facturasCount,
      count: filteredGastos.length,
      topCategory,
      topCategoryAmount,
      topCategoryPercent,
      promedioGasto,
      categoryTotals
    };
  }, [filteredGastos, entidad]);

  const openNewExpenseModal = () => {
    setEditingId(null);
    setScanProviderBadge('');
    setScanError('');
    setFormData(getEmptyForm(entidad));
    setIsModalOpen(true);
  };

  const openEditExpenseModal = (gasto) => {
    setEditingId(gasto.id);
    setScanProviderBadge('');
    setScanError('');
    setFormData({
      fecha: gasto.fecha || new Date().toISOString().split('T')[0],
      tipoDocumento: gasto.tipoDocumento || gasto.tipo_doc || 'Boleta Electrónica',
      rutEmisor: gasto.rutEmisor || gasto.rut || '',
      razonSocial: gasto.razonSocial || gasto.proveedor || '',
      categoria: gasto.categoria || (entidad === 'casa' ? 'Supermercado / Abarrotes' : 'Otros Gastos'),
      descripcion: gasto.descripcion || '',
      total: gasto.total ?? gasto.total_bruto ?? '',
      neto: gasto.neto ?? '',
      iva: gasto.iva ?? '',
      comprobanteImg: gasto.comprobanteImg || gasto.comprobante_url || '',
      nombreArchivo: gasto.nombreArchivo || ''
    });
    setIsModalOpen(true);
  };

  /**
   * Envía la imagen en Base64 directamente a POST /api/expenses/scan-receipt
   * sin comprobar localStorage ni mostrar alertas previas.
   */
  const handleReceiptFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsScanning(true);
      setScanProviderBadge('');
      setScanError('');

      // Comprime la imagen en cliente vía Canvas a máx 900px y calidad 0.7 (payload < 250 KB)
      const compressedBase64 = await compressReceiptImage(file, 900, 0.7);
      const mimeType = 'image/jpeg';

      setFormData((prev) => ({
        ...prev,
        comprobanteImg: compressedBase64,
        nombreArchivo: file.name
      }));

      const extracted = await scanReceiptWithAI({
        imageBase64: compressedBase64,
        mimeType,
        entidad
      });

      setFormData((prev) => ({
        ...prev,
        fecha: extracted.fecha || prev.fecha,
        tipoDocumento: extracted.tipoDoc || extracted.tipoDocumento || prev.tipoDocumento,
        rutEmisor: extracted.rutEmisor ?? prev.rutEmisor,
        razonSocial: extracted.razonSocial || prev.razonSocial,
        categoria: extracted.categoria || prev.categoria,
        descripcion: extracted.descripcion || prev.descripcion,
        total: extracted.montoTotal ?? extracted.total,
        neto: extracted.montoNeto ?? extracted.neto,
        iva: extracted.iva,
        comprobanteImg: compressedBase64,
        nombreArchivo: file.name
      }));

      setScanProviderBadge(extracted.provider || 'gemini');
      addToast(
        `Comprobante analizado con éxito (${extracted.razonSocial || extracted.tipoDocumento} • ${formatCurrency(extracted.total)})`,
        'success'
      );
    } catch (error) {
      console.error('Error escaneando boleta con IA:', error);
      const msg = error?.message || 'Error al analizar la imagen en el servidor.';
      setScanError(msg);
      addToast(msg, 'error');
    } finally {
      setIsScanning(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleTotalChange = (newTotalStr) => {
    const cleanVal = newTotalStr === '' ? '' : Math.max(0, Math.round(Number(newTotalStr) || 0));
    if (cleanVal === '') {
      setFormData((prev) => ({ ...prev, total: '', neto: '', iva: '' }));
      return;
    }
    const { total, neto, iva } = calculateTaxBreakdown(cleanVal, formData.tipoDocumento);
    setFormData((prev) => ({ ...prev, total, neto, iva }));
  };

  const handleDocTypeChange = (newDocType) => {
    const currentTotal = Number(formData.total) || 0;
    if (currentTotal > 0) {
      const { total, neto, iva } = calculateTaxBreakdown(currentTotal, newDocType);
      setFormData((prev) => ({ ...prev, tipoDocumento: newDocType, total, neto, iva }));
    } else {
      setFormData((prev) => ({ ...prev, tipoDocumento: newDocType }));
    }
  };

  const handleRazonSocialChange = (val) => {
    const suggestedCat =
      entidad === 'casa'
        ? classifyCasaCategoryFromText(`${val} ${formData.descripcion}`)
        : classifyCategoryFromText(`${val} ${formData.descripcion}`);
    const defaultCat = entidad === 'casa' ? 'Otros Hogar' : 'Otros Gastos';
    setFormData((prev) => ({
      ...prev,
      razonSocial: val,
      categoria: suggestedCat !== defaultCat ? suggestedCat : prev.categoria
    }));
  };

  const handleSaveExpense = async (e) => {
    e.preventDefault();
    const totalNum = Math.round(Number(formData.total) || 0);
    if (totalNum <= 0) {
      addToast('Ingresa un Monto Total válido mayor a $0.', 'warning');
      return;
    }

    const netoNum =
      formData.neto !== '' && Number(formData.neto) > 0
        ? Math.round(Number(formData.neto))
        : Math.round(totalNum / 1.19);
    const ivaNum =
      formData.iva !== '' && Number(formData.iva) > 0
        ? Math.round(Number(formData.iva))
        : totalNum - netoNum;

    const defaultMerchant = entidad === 'casa' ? 'Comercio General' : 'Proveedor General';

    const record = {
      id: editingId || undefined,
      entidad,
      scope: entidad,
      fecha: formData.fecha || new Date().toISOString().split('T')[0],
      tipoDocumento: formData.tipoDocumento,
      tipo_doc: formData.tipoDocumento,
      rutEmisor: formData.rutEmisor.trim(),
      rut: formData.rutEmisor.trim(),
      razonSocial: formData.razonSocial.trim() || defaultMerchant,
      proveedor: formData.razonSocial.trim() || defaultMerchant,
      categoria: formData.categoria,
      descripcion:
        formData.descripcion.trim() ||
        `${formData.razonSocial.trim() || 'Gasto'} — ${formData.categoria}`,
      total: totalNum,
      total_bruto: totalNum,
      neto: netoNum,
      iva: ivaNum,
      comprobanteImg: formData.comprobanteImg || '',
      comprobante_url: formData.comprobanteImg || '',
      nombreArchivo: formData.nombreArchivo || ''
    };

    try {
      setIsSaving(true);
      // Actualización optimista inmediata en la interfaz
      if (editingId) {
        setGastos((prev) => prev.map((g) => (g.id === editingId ? { ...g, ...record } : g)));
      } else {
        setGastos((prev) => [{ ...record, id: record.id || 'temp-' + Date.now() }, ...prev]);
      }

      // Persistencia centralizada en la base de datos (Supabase / Backend)
      const saved = await saveCentralizedExpense(record, entidad);

      setGastos((prev) =>
        prev.map((g) => (g.id === editingId || g.id === record.id ? saved : g))
      );

      addToast(
        editingId ? 'Gasto actualizado en la base de datos central.' : 'Gasto sincronizado en la base de datos central.',
        'success'
      );
      setIsModalOpen(false);
      // Revalida el estado completo
      loadExpenses(false);
    } catch (err) {
      console.error(`Error guardando gasto (${entidad}) en Supabase:`, err);
      addToast('Error al sincronizar con la base de datos: ' + err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm(`¿Eliminar este registro de gasto de ${entidad === 'casa' ? 'Casa' : 'Empresa'} de la base de datos central?`)) return;
    try {
      setGastos((prev) => prev.filter((g) => g.id !== id));
      await deleteCentralizedExpense(id, entidad);
      addToast('Registro de gasto eliminado de la base de datos.', 'info');
      loadExpenses(false);
    } catch (err) {
      console.error(`Error eliminando gasto (${entidad}):`, err);
      addToast('Error al eliminar de la base de datos: ' + err.message, 'error');
    }
  };

  const handleExportExcel = () => {
    if (filteredGastos.length === 0) {
      addToast('No hay gastos para exportar en el filtro actual.', 'warning');
      return;
    }

    const rows = filteredGastos.map((g) => ({
      'ID Gasto': g.id,
      'Fecha Emisión': g.fecha,
      'Tipo Documento': g.tipoDocumento || g.tipo_doc || 'Boleta Electrónica',
      'RUT Emisor': g.rutEmisor || g.rut || 'S/I',
      [entidad === 'casa' ? 'Comercio / Tienda' : 'Proveedor / Razón Social']:
        g.razonSocial || g.proveedor || 'General',
      [entidad === 'casa' ? 'Categoría Hogar' : 'Categoría Contable']:
        g.categoria || (entidad === 'casa' ? 'Otros Hogar' : 'Otros Gastos'),
      'Descripción / Glosa': g.descripcion || '',
      'Monto Neto (CLP)': Number(g.neto) || 0,
      'IVA 19% (CLP)': Number(g.iva) || 0,
      'Total Bruto (CLP)': Number(g.total ?? g.total_bruto) || 0,
      'Comprobante Adjunto':
        g.comprobanteImg || g.comprobante_url
          ? `Sí (${g.nombreArchivo || 'Imagen capturada'})`
          : 'Sin adjunto'
    }));

    // Fila final destacada de totales para auditoría contable o familiar
    rows.push({
      'ID Gasto': '=== TOTALES DEL PERIODO ===',
      'Fecha Emisión': activeDateRange.label,
      'Tipo Documento': `${kpis.count} Documentos`,
      'RUT Emisor': '',
      [entidad === 'casa' ? 'Comercio / Tienda' : 'Proveedor / Razón Social']:
        entidad === 'casa' ? 'Hogar & Familia' : `${kpis.facturasCount} Facturas SII`,
      [entidad === 'casa' ? 'Categoría Hogar' : 'Categoría Contable']:
        entidad === 'casa' ? 'CIERRE MENSUAL FAMILIAR' : 'CIERRE CONTABLE',
      'Descripción / Glosa': `Total Bruto: $${kpis.totalBruto.toLocaleString('es-CL')}`,
      'Monto Neto (CLP)': kpis.totalNeto,
      'IVA 19% (CLP)': kpis.totalIva,
      'Total Bruto (CLP)': kpis.totalBruto,
      'Comprobante Adjunto': ''
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    const sheetName = entidad === 'casa' ? 'Gastos_Casa' : 'Rendicion_Gastos';
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    const cleanSuffix = (activeDateRange.fileSuffix || 'Historial').replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName =
      entidad === 'casa'
        ? `Gastos_Casa_EcoSilence_${cleanSuffix}.xlsx`
        : `Gastos_Empresa_EcoSilence_${cleanSuffix}.xlsx`;

    XLSX.writeFile(workbook, fileName);
    addToast(`Reporte descargado: ${fileName}`, 'success');
  };

  const getCategoryBadgeStyle = (cat = '') => {
    const lower = String(cat).toLowerCase();
    // Transporte / Bencina
    if (lower.includes('transporte') || lower.includes('bencina')) {
      return { background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' };
    }
    // Casa: Supermercado
    if (lower.includes('supermercado') || lower.includes('abarrote')) {
      return { background: 'rgba(16, 185, 129, 0.18)', color: '#34d399' };
    }
    // Casa: Cuentas Básicas (Luz, Agua, Gas, Internet)
    if (lower.includes('cuenta') || lower.includes('básica') || lower.includes('luz') || lower.includes('agua') || lower.includes('gas') || lower.includes('internet')) {
      return { background: 'rgba(14, 165, 233, 0.18)', color: '#38bdf8' };
    }
    // Casa: Arriendo / Gastos Comunes
    if (lower.includes('arriendo') || lower.includes('comun') || lower.includes('común')) {
      return { background: 'rgba(245, 158, 11, 0.18)', color: '#fbbf24' };
    }
    // Casa: Mascotas / Veterinaria
    if (lower.includes('mascota') || lower.includes('veterinaria')) {
      return { background: 'rgba(249, 115, 22, 0.18)', color: '#fb923c' };
    }
    // Casa: Salud / Farmacia
    if (lower.includes('salud') || lower.includes('farmacia') || lower.includes('médic') || lower.includes('medic')) {
      return { background: 'rgba(239, 68, 68, 0.18)', color: '#f87171' };
    }
    // Casa: Salidas / Delivery / Ocio
    if (lower.includes('salida') || lower.includes('delivery') || lower.includes('ocio') || lower.includes('restaurant')) {
      return { background: 'rgba(236, 72, 153, 0.18)', color: '#f472b6' };
    }
    // Empresa: Alimentación / Viáticos
    if (lower.includes('alimenta') || lower.includes('viático') || lower.includes('viatico')) {
      return { background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24' };
    }
    // Empresa: Insumos / Herramientas
    if (lower.includes('insumo') || lower.includes('herramienta') || lower.includes('manten') || lower.includes('ferreter')) {
      return { background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' };
    }
    // Empresa: Gimnasio
    if (lower.includes('gimnasio') || lower.includes('fitness')) {
      return { background: 'rgba(168, 85, 247, 0.18)', color: '#c084fc' };
    }
    return { background: 'rgba(148, 163, 184, 0.15)', color: '#cbd5e1' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div>
          <h1 style={{ marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            {entidad === 'casa' ? (
              <>
                <Home size={28} color="#f59e0b" />
                <span>Gastos Casa (Hogar & Familia)</span>
                <span
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '999px',
                    background: 'rgba(245, 158, 11, 0.18)',
                    color: '#fbbf24',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <Home size={12} /> Ámbito Personal
                </span>
              </>
            ) : (
              <>
                <Building2 size={28} color="var(--accent-primary)" />
                <span>Control de Gastos y Rendiciones</span>
                <span
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '999px',
                    background: 'rgba(99, 102, 241, 0.18)',
                    color: '#818cf8',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <Building2 size={12} /> Empresa EcoSilence
                </span>
              </>
            )}
            <span
              style={{
                fontSize: '0.75rem',
                padding: '0.2rem 0.6rem',
                borderRadius: '999px',
                background: 'rgba(99, 102, 241, 0.18)',
                color: '#818cf8',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <Sparkles size={12} /> OCR Vision AI
            </span>
            <span
              style={{
                fontSize: '0.75rem',
                padding: '0.2rem 0.6rem',
                borderRadius: '999px',
                background: 'rgba(16, 185, 129, 0.18)',
                color: '#34d399',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
              title="Sincronización en vivo con Supabase"
            >
              <CheckCircle2 size={12} /> Supabase Realtime
            </span>
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            {entidad === 'casa'
              ? 'Control financiero personal y del hogar con escaneo inteligente de boletas de supermercado, cuentas básicas, salud y ocio.'
              : 'Escaneo inteligente de boletas, facturas electrónicas SII y vouchers con extracción tributaria en vivo.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn btn-ghost" onClick={handleExportExcel}>
            <FileSpreadsheet size={18} color="var(--color-basil)" /> Exportar Excel
          </button>

          <button className="btn btn-primary" onClick={openNewExpenseModal}>
            <Plus size={18} /> {entidad === 'casa' ? 'Registrar Gasto Casa' : 'Registrar Nuevo Gasto'}
          </button>
        </div>
      </div>

      {/* KPIs Dinámicos según la entidad */}
      <div className="responsive-grid-cards">
        {/* Card 1: Total Gastos del Periodo */}
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', padding: '1.2rem' }}>
          <div style={{ background: 'var(--color-tomato-bg)', padding: '0.8rem', borderRadius: '50%', color: 'var(--color-tomato)' }}>
            <DollarSign size={24} />
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.2rem' }}>
              {entidad === 'casa' ? 'Total Gastos del Hogar' : 'Total Gastos del Periodo'} ({kpis.count} {kpis.count === 1 ? 'doc' : 'docs'})
            </p>
            <h2 style={{ fontSize: '1.4rem', margin: 0 }}>{formatCurrency(kpis.totalBruto)}</h2>
            <p className="text-xs text-slate-400" style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
              {entidad === 'casa' ? (
                `Ref. Neto: ${formatCurrency(kpis.totalNeto)} | IVA incl: ${formatCurrency(kpis.totalIva)}`
              ) : (
                `Neto: ${formatCurrency(kpis.totalNeto)} | IVA (19%): ${formatCurrency(kpis.totalIva)}`
              )}
            </p>
            {selectedPeriod !== 'all' && (
              <div style={{ marginTop: '0.4rem' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontSize: '0.72rem',
                    padding: '0.15rem 0.55rem',
                    borderRadius: '6px',
                    background: 'rgba(99, 102, 241, 0.18)',
                    color: '#a5b4fc',
                    fontWeight: 600
                  }}
                >
                  <Calendar size={11} /> Periodo: {activeDateRange.label}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Para Empresa = IVA Crédito Fiscal SII | Para Casa = Comprobantes & Promedio */}
        {entidad === 'casa' ? (
          <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', padding: '1.2rem' }}>
            <div style={{ background: 'rgba(14, 165, 233, 0.18)', padding: '0.8rem', borderRadius: '50%', color: '#38bdf8' }}>
              <Receipt size={24} />
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.2rem' }}>
                Gasto Promedio por Boleta
              </p>
              <h2 style={{ fontSize: '1.4rem', margin: 0 }}>
                {kpis.count > 0 ? formatCurrency(kpis.promedioGasto) : '$0'}
              </h2>
              <p className="text-xs text-slate-400" style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                {kpis.count} compras registradas en el periodo
              </p>
            </div>
          </div>
        ) : (
          <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', padding: '1.2rem' }}>
            <div style={{ background: 'var(--color-basil-bg)', padding: '0.8rem', borderRadius: '50%', color: 'var(--color-basil)' }}>
              <Receipt size={24} />
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.2rem' }}>
                IVA Crédito Fiscal Recuperable ({kpis.facturasCount} {kpis.facturasCount === 1 ? 'Factura' : 'Facturas'})
              </p>
              <h2 style={{ fontSize: '1.4rem', margin: 0 }}>{formatCurrency(kpis.ivaCreditoFiscal)}</h2>
              <p className="text-xs text-slate-400" style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                Recuperable ante SII (19% Facturas del periodo)
              </p>
            </div>
          </div>
        )}

        {/* Card 3: Para Empresa = Escaneo IA | Para Casa = Mayor Categoría de Gasto */}
        {entidad === 'casa' ? (
          <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', padding: '1.2rem' }}>
            <div style={{ background: 'rgba(245, 158, 11, 0.18)', padding: '0.8rem', borderRadius: '50%', color: '#fbbf24' }}>
              <Tag size={24} />
            </div>
            <div style={{ overflow: 'hidden' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.2rem' }}>
                Mayor Categoría de Gasto
              </p>
              <h2 style={{ fontSize: '1.2rem', margin: 0, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {kpis.topCategoryAmount > 0 ? formatCurrency(kpis.topCategoryAmount) : 'Sin gastos'}
              </h2>
              <p className="text-xs text-slate-400" style={{ fontSize: '0.75rem', color: '#fbbf24', marginTop: '0.25rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {kpis.topCategory} ({kpis.topCategoryPercent}% del total)
              </p>
            </div>
          </div>
        ) : (
          <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', padding: '1.2rem' }}>
            <div style={{ background: 'var(--color-berry-bg)', padding: '0.8rem', borderRadius: '50%', color: 'var(--color-berry)' }}>
              <ScanLine size={24} />
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.2rem' }}>
                Escaneo Rápido IA
              </p>
              <button
                className="btn btn-primary"
                style={{ padding: '0.45rem 0.9rem', fontSize: '0.82rem', marginTop: '0.2rem' }}
                onClick={openNewExpenseModal}
              >
                <ScanLine size={15} /> Escanear Boleta con IA
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tabla y Filtros de Auditoría */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div
          style={{
            display: 'flex',
            gap: '0.8rem',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          {/* Buscador general */}
          <div className="search-bar" style={{ width: '100%', maxWidth: '320px', minWidth: '220px' }}>
            <Search size={18} />
            <input
              type="text"
              placeholder="Buscar por comercio, RUT o glosa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Barra de Filtros */}
          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Selector Rápido de Periodo */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'var(--bg-dark)',
                padding: '0.45rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)'
              }}
              title="Filtrar por Periodo o Año"
            >
              <Calendar size={15} color="var(--accent-primary)" />
              <select
                className="input-control"
                style={{ border: 'none', background: 'transparent', padding: 0, fontSize: '0.86rem', color: 'inherit' }}
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
              >
                <option value="all">Todo el Historial</option>
                <option value="this_month">Este Mes ({currentMonthLabel})</option>
                <option value="last_month">Mes Anterior ({prevMonthLabel})</option>
                {availableYears.map((yr) => (
                  <option key={yr} value={`year_${yr}`}>
                    Año {yr}
                  </option>
                ))}
                <option value="custom">Rango Personalizado...</option>
              </select>
            </div>

            {/* Inputs de Rango Personalizado (Desde / Hasta) */}
            {selectedPeriod === 'custom' && (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    background: 'var(--bg-dark)',
                    padding: '0.42rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Desde:</span>
                  <input
                    type="date"
                    className="input-control"
                    style={{
                      border: 'none',
                      background: 'transparent',
                      padding: 0,
                      fontSize: '0.84rem',
                      color: 'inherit',
                      outline: 'none'
                    }}
                    value={customDateFrom}
                    onChange={(e) => setCustomDateFrom(e.target.value)}
                  />
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    background: 'var(--bg-dark)',
                    padding: '0.42rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Hasta:</span>
                  <input
                    type="date"
                    className="input-control"
                    style={{
                      border: 'none',
                      background: 'transparent',
                      padding: 0,
                      fontSize: '0.84rem',
                      color: 'inherit',
                      outline: 'none'
                    }}
                    value={customDateTo}
                    onChange={(e) => setCustomDateTo(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Filtro Categoría */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'var(--bg-dark)',
                padding: '0.45rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)'
              }}
            >
              <Filter size={15} color="var(--text-muted)" />
              <select
                className="input-control"
                style={{ border: 'none', background: 'transparent', padding: 0, fontSize: '0.86rem', color: 'inherit' }}
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="Todas">Todas las Categorías</option>
                {availableCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro Tipo Doc */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'var(--bg-dark)',
                padding: '0.45rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)'
              }}
            >
              <Receipt size={15} color="var(--text-muted)" />
              <select
                className="input-control"
                style={{ border: 'none', background: 'transparent', padding: 0, fontSize: '0.86rem', color: 'inherit' }}
                value={selectedDocType}
                onChange={(e) => setSelectedDocType(e.target.value)}
              >
                <option value="Todos">Todos los Documentos</option>
                {availableDocTypes.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Botón Limpiar Filtros */}
            {isFilterActive && (
              <button
                className="btn btn-ghost"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.8rem',
                  padding: '0.45rem 0.8rem',
                  color: '#f87171',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: 'var(--radius-sm)'
                }}
                onClick={handleClearFilters}
                title="Restablecer todos los filtros"
              >
                <RotateCcw size={13} /> Limpiar Filtros
              </button>
            )}
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="sticky-header" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr
                style={{
                  borderBottom: '1px solid var(--border-color)',
                  color: 'var(--text-muted)',
                  fontSize: '0.8rem',
                  textTransform: 'uppercase'
                }}
              >
                <th style={{ padding: '0.9rem 1rem' }}>Fecha</th>
                <th style={{ padding: '0.9rem 1rem' }}>Tipo Doc</th>
                <th style={{ padding: '0.9rem 1rem' }}>Proveedor / RUT</th>
                <th style={{ padding: '0.9rem 1rem' }}>Categoría</th>
                <th style={{ padding: '0.9rem 1rem' }}>Descripción</th>
                <th style={{ padding: '0.9rem 1rem', textAlign: 'right' }}>Neto</th>
                <th style={{ padding: '0.9rem 1rem', textAlign: 'right' }}>IVA (19%)</th>
                <th style={{ padding: '0.9rem 1rem', textAlign: 'right' }}>Total Bruto</th>
                <th style={{ padding: '0.9rem 1rem', textAlign: 'center' }}>Comprobante</th>
                <th style={{ padding: '0.9rem 1rem', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredGastos.map((g) => {
                const catStyle = getCategoryBadgeStyle(g.categoria);
                return (
                  <tr key={g.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.9rem 1rem', fontSize: '0.88rem', whiteSpace: 'nowrap' }}>{g.fecha}</td>
                    <td style={{ padding: '0.9rem 1rem' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          padding: '0.25rem 0.6rem',
                          borderRadius: '6px',
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid var(--border-color)',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {g.tipoDocumento}
                      </span>
                    </td>
                    <td style={{ padding: '0.9rem 1rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{g.razonSocial || '—'}</div>
                      {g.rutEmisor && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>RUT: {g.rutEmisor}</div>
                      )}
                    </td>
                    <td style={{ padding: '0.9rem 1rem' }}>
                      <span
                        style={{
                          ...catStyle,
                          padding: '0.25rem 0.65rem',
                          borderRadius: '999px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {g.categoria}
                      </span>
                    </td>
                    <td style={{ padding: '0.9rem 1rem', fontSize: '0.86rem', color: 'var(--text-muted)', maxWidth: '280px' }}>
                      {g.descripcion}
                    </td>
                    <td style={{ padding: '0.9rem 1rem', textAlign: 'right', fontSize: '0.86rem', color: 'var(--text-muted)' }}>
                      {formatCurrency(g.neto)}
                    </td>
                    <td style={{ padding: '0.9rem 1rem', textAlign: 'right', fontSize: '0.86rem', color: 'var(--text-muted)' }}>
                      {formatCurrency(g.iva)}
                    </td>
                    <td style={{ padding: '0.9rem 1rem', textAlign: 'right', fontWeight: 700, fontSize: '0.95rem' }}>
                      {formatCurrency(g.total)}
                    </td>
                    <td style={{ padding: '0.9rem 1rem', textAlign: 'center' }}>
                      {g.comprobanteImg ? (
                        <button
                          className="btn btn-ghost"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', color: '#818cf8' }}
                          onClick={() => setPreviewExpense(g)}
                          title="Ver imagen de boleta/factura capturada"
                        >
                          <Eye size={14} /> Ver
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '0.9rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: '0.35rem 0.5rem' }}
                          onClick={() => openEditExpenseModal(g)}
                          title="Editar Gasto"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: '0.35rem 0.5rem', color: 'var(--color-tomato)' }}
                          onClick={() => handleDeleteExpense(g.id)}
                          title="Eliminar Gasto"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredGastos.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem' }}>
                      <Receipt size={32} style={{ opacity: 0.35 }} />
                      <p style={{ margin: 0, fontSize: '0.95rem' }}>
                        No hay gastos registrados para este periodo o filtro aplicado.
                      </p>
                      {isFilterActive && (
                        <button
                          className="btn btn-ghost"
                          style={{
                            marginTop: '0.35rem',
                            fontSize: '0.8rem',
                            color: 'var(--accent-primary)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem'
                          }}
                          onClick={handleClearFilters}
                        >
                          <RotateCcw size={13} /> Restablecer filtros
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: + Registrar Nuevo Gasto con Auto-Escaneo IA */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => !isScanning && setIsModalOpen(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: '680px', padding: '2rem' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.25rem'
              }}
            >
              <div>
                <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  {entidad === 'casa' ? (
                    <Home size={22} color="#f59e0b" />
                  ) : (
                    <Receipt size={22} color="var(--accent-primary)" />
                  )}
                  {editingId
                    ? `Editar Gasto (${entidad === 'casa' ? 'Casa' : 'Empresa'})`
                    : `+ Registrar Gasto ${entidad === 'casa' ? 'Casa' : 'Empresa'}`}
                </h2>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  {entidad === 'casa'
                    ? 'Escanea boletas de supermercado, farmacias o cuentas del hogar con Vision AI o edítalas manualmente.'
                    : 'Escanea una boleta o factura con IA para autocompletar los campos o edítalos manualmente.'}
                </p>
              </div>
              <button
                className="btn btn-ghost"
                style={{ padding: '0.4rem' }}
                onClick={() => !isScanning && setIsModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            {/* BLOQUE 1: Botón destacado de Escaneo IA y Cámara */}
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.14) 0%, rgba(168, 85, 247, 0.14) 100%)',
                border: '1px solid rgba(99, 102, 241, 0.4)',
                borderRadius: 'var(--radius-md)',
                padding: '1.1rem 1.25rem',
                marginBottom: '1.4rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.9rem'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.8rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '10px',
                      background: 'var(--accent-gradient)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      flexShrink: 0
                    }}
                  >
                    <ScanLine size={22} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      {entidad === 'casa'
                        ? 'Lectura Inteligente Hogar & Familia (Gemini AI)'
                        : 'Lectura Tributaria Automática (SII Chile)'}
                      <Sparkles size={14} color="#fbbf24" />
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {entidad === 'casa'
                        ? 'Extrae comercio (Supermercados, Farmacias, Cuentas), fecha y montos de boletas familiares.'
                        : 'Extrae comercio real, RUT, fecha y calcula Neto + IVA (19%) directamente de tu foto.'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/*"
                    style={{ display: 'none' }}
                    onChange={handleReceiptFileSelected}
                  />
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    style={{ display: 'none' }}
                    onChange={handleReceiptFileSelected}
                  />

                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={isScanning}
                    onClick={() => fileInputRef.current?.click()}
                    style={{ fontWeight: 600 }}
                  >
                    <ScanLine size={18} />
                    Escanear Boleta con IA
                  </button>

                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={isScanning}
                    onClick={() => cameraInputRef.current?.click()}
                    title="Tomar foto directamente con la cámara del celular"
                    style={{ borderColor: 'rgba(255,255,255,0.2)' }}
                  >
                    <Camera size={17} />
                    Cámara
                  </button>
                </div>
              </div>

              {/* Estado de carga visual */}
              {isScanning && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.85rem',
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(15, 17, 26, 0.75)',
                    border: '1px solid rgba(99, 102, 241, 0.45)'
                  }}
                >
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      border: '2px solid #818cf8',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite',
                      flexShrink: 0
                    }}
                  />
                  <span style={{ fontSize: '0.9rem', fontWeight: 500, color: '#e2e8f0' }}>
                    Analizando documento y extrayendo montos...
                  </span>
                </div>
              )}

              {/* Alerta de error si la petición al servidor falla */}
              {scanError && !isScanning && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(239, 68, 68, 0.14)',
                    border: '1px solid var(--color-tomato)',
                    color: '#fca5a5',
                    fontSize: '0.83rem'
                  }}
                >
                  <AlertTriangle size={18} color="var(--color-tomato)" style={{ flexShrink: 0 }} />
                  <span>{scanError}</span>
                </div>
              )}

              {/* Vista previa miniatura del comprobante capturado */}
              {formData.comprobanteImg && !isScanning && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    padding: '0.65rem 0.9rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.35)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <img
                      src={formData.comprobanteImg}
                      alt="Comprobante capturado"
                      style={{
                        width: '44px',
                        height: '44px',
                        objectFit: 'cover',
                        borderRadius: '6px',
                        border: '1px solid rgba(255,255,255,0.2)'
                      }}
                    />
                    <div>
                      <div
                        style={{
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          color: '#34d399',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem'
                        }}
                      >
                        <CheckCircle2 size={14} /> Comprobante adjunto listo para contabilidad
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        {formData.nombreArchivo || 'captura_boleta.jpg'}
                        {scanProviderBadge ? ` • Extraído vía ${scanProviderBadge}` : ''}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                    onClick={() =>
                      setPreviewExpense({
                        descripcion: formData.descripcion || 'Vista previa del comprobante',
                        comprobanteImg: formData.comprobanteImg,
                        nombreArchivo: formData.nombreArchivo
                      })
                    }
                  >
                    <Eye size={14} /> Ampliar
                  </button>
                </div>
              )}
            </div>

            {/* FORMULARIO AUTO-RELLENADO Y EDITABLE */}
            <form onSubmit={handleSaveExpense}>
              <div className="responsive-grid-2" style={{ gap: '1rem' }}>
                <div className="input-group" style={{ marginBottom: '0.8rem' }}>
                  <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Calendar size={14} /> Fecha de Emisión
                  </label>
                  <input
                    type="date"
                    className="input-control"
                    required
                    value={formData.fecha}
                    onChange={(e) => setFormData((prev) => ({ ...prev, fecha: e.target.value }))}
                  />
                </div>

                <div className="input-group" style={{ marginBottom: '0.8rem' }}>
                  <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Receipt size={14} /> Tipo Doc
                  </label>
                  <select
                    className="input-control"
                    value={formData.tipoDocumento}
                    onChange={(e) => handleDocTypeChange(e.target.value)}
                  >
                    {availableDocTypes.map((docType) => (
                      <option key={docType} value={docType}>
                        {docType}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="responsive-grid-2" style={{ gap: '1rem' }}>
                <div className="input-group" style={{ marginBottom: '0.8rem' }}>
                  <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    {entidad === 'casa' ? <Home size={14} /> : <Building2 size={14} />}
                    {entidad === 'casa' ? 'Comercio / Tienda / Emisor' : 'Razón Social / Proveedor'}
                  </label>
                  <input
                    type="text"
                    className="input-control"
                    placeholder={
                      entidad === 'casa'
                        ? 'Ej: Lider, Jumbo, Enel, Farmacias Ahumada...'
                        : 'Nombre del comercio extraído de la boleta'
                    }
                    value={formData.razonSocial}
                    onChange={(e) => handleRazonSocialChange(e.target.value)}
                  />
                </div>

                <div className="input-group" style={{ marginBottom: '0.8rem' }}>
                  <label className="input-label">RUT del Emisor</label>
                  <input
                    type="text"
                    className="input-control"
                    placeholder="XX.XXX.XXX-X"
                    value={formData.rutEmisor}
                    onChange={(e) => setFormData((prev) => ({ ...prev, rutEmisor: e.target.value }))}
                  />
                </div>
              </div>

              <div className="input-group" style={{ marginBottom: '0.8rem' }}>
                <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Tag size={14} />{' '}
                  {entidad === 'casa'
                    ? 'Categoría del Hogar (Auto-clasificada)'
                    : 'Categoría Contable (Auto-clasificada por giro)'}
                </label>
                <input
                  type="text"
                  list="expense-categories-list"
                  className="input-control"
                  placeholder={
                    entidad === 'casa'
                      ? 'Ej: Supermercado / Abarrotes, Cuentas Básicas...'
                      : 'Ej: Gimnasio/Fitness, Transporte / Bencina...'
                  }
                  value={formData.categoria}
                  onChange={(e) => setFormData((prev) => ({ ...prev, categoria: e.target.value }))}
                />
                <datalist id="expense-categories-list">
                  {availableCategories.map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>

              <div className="input-group" style={{ marginBottom: '1rem' }}>
                <label className="input-label">Descripción (Razón Social + Resumen de Ítems)</label>
                <input
                  type="text"
                  className="input-control"
                  required
                  placeholder="Resumen real del gasto extraído de la boleta"
                  value={formData.descripcion}
                  onChange={(e) => setFormData((prev) => ({ ...prev, descripcion: e.target.value }))}
                />
              </div>

              {/* Montos: Total Bruto, Neto e IVA (19%) */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: '1rem',
                  padding: '1rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(255, 255, 255, 0.025)',
                  border: '1px solid var(--border-color)',
                  marginBottom: '1.5rem'
                }}
              >
                <div className="input-group" style={{ margin: 0 }}>
                  <label className="input-label" style={{ color: '#f8fafc', fontWeight: 600 }}>
                    Monto Total Bruto ($ CLP)
                  </label>
                  <input
                    type="number"
                    className="input-control"
                    required
                    min="0"
                    placeholder="0"
                    style={{ fontWeight: 700, fontSize: '1.05rem', borderColor: 'rgba(99, 102, 241, 0.5)' }}
                    value={formData.total}
                    onChange={(e) => handleTotalChange(e.target.value)}
                  />
                </div>

                <div className="input-group" style={{ margin: 0 }}>
                  <label className="input-label">Monto Neto ($ CLP)</label>
                  <input
                    type="number"
                    className="input-control"
                    min="0"
                    placeholder="0"
                    value={formData.neto}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, neto: e.target.value === '' ? '' : Number(e.target.value) }))
                    }
                  />
                </div>

                <div className="input-group" style={{ margin: 0 }}>
                  <label className="input-label">IVA 19% ($ CLP)</label>
                  <input
                    type="number"
                    className="input-control"
                    min="0"
                    placeholder="0"
                    value={formData.iva}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, iva: e.target.value === '' ? '' : Number(e.target.value) }))
                    }
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem' }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isScanning || isSaving}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={isScanning || isSaving}>
                  {isSaving ? 'Guardando en Base de Datos...' : editingId ? 'Actualizar Gasto' : 'Guardar Gasto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Vista Previa del Comprobante Original */}
      {previewExpense && (
        <div className="modal-overlay" onClick={() => setPreviewExpense(null)}>
          <div
            className="modal-content"
            style={{ maxWidth: '580px', padding: '1.5rem' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0 }}>Comprobante Contable Adjunto</h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {previewExpense.descripcion}
                </p>
              </div>
              <button className="btn btn-ghost" style={{ padding: '0.4rem' }} onClick={() => setPreviewExpense(null)}>
                <X size={20} />
              </button>
            </div>

            <div
              style={{
                background: '#090a0f',
                borderRadius: 'var(--radius-sm)',
                padding: '1rem',
                textAlign: 'center',
                border: '1px solid var(--border-color)'
              }}
            >
              <img
                src={previewExpense.comprobanteImg}
                alt="Comprobante"
                style={{ maxWidth: '100%', maxHeight: '65vh', borderRadius: '6px', objectFit: 'contain' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
              <a
                href={previewExpense.comprobanteImg}
                download={previewExpense.nombreArchivo || 'comprobante_gasto.jpg'}
                className="btn btn-primary"
                style={{ textDecoration: 'none' }}
              >
                <Download size={16} /> Descargar Comprobante
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GastosView;
