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
  KeyRound,
  Download,
  AlertTriangle
} from 'lucide-react';
import {
  EXPENSE_DOC_TYPES,
  EXPENSE_CATEGORIES,
  scanReceiptWithAI,
  compressReceiptImage,
  calculateTaxBreakdown,
  classifyCategoryFromText
} from '../services/receiptScannerService';

const STORAGE_KEY = 'ecosilence_gastos_registros_v1';

const EMPTY_FORM = {
  fecha: new Date().toISOString().split('T')[0],
  tipoDocumento: 'Boleta Electrónica',
  rutEmisor: '',
  razonSocial: '',
  categoria: 'Otros Gastos',
  descripcion: '',
  total: '',
  neto: '',
  iva: '',
  comprobanteImg: '',
  nombreArchivo: ''
};

const GastosView = () => {
  const { addToast } = useToast();
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const [gastos, setGastos] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(gastos));
    } catch (e) {
      console.warn('Error guardando gastos en localStorage:', e);
    }
  }, [gastos]);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [selectedDocType, setSelectedDocType] = useState('Todos');

  // Estados del Modal "+ Registrar Nuevo Gasto"
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProviderBadge, setScanProviderBadge] = useState('');
  const [scanError, setScanError] = useState('');

  // Modal de previsualización de comprobante
  const [previewExpense, setPreviewExpense] = useState(null);

  // Modal para configurar API Key de Gemini 2.0 Flash
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState(
    () => localStorage.getItem('ecosilence_gemini_api_key') || ''
  );

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

  const availableCategories = useMemo(() => {
    const set = new Set(EXPENSE_CATEGORIES);
    (gastos || []).forEach((g) => {
      if (g.categoria) set.add(g.categoria);
    });
    if (formData.categoria) set.add(formData.categoria);
    return Array.from(set);
  }, [gastos, formData.categoria]);

  const availableDocTypes = useMemo(() => {
    const set = new Set(EXPENSE_DOC_TYPES);
    (gastos || []).forEach((g) => {
      if (g.tipoDocumento) set.add(g.tipoDocumento);
    });
    if (formData.tipoDocumento) set.add(formData.tipoDocumento);
    return Array.from(set);
  }, [gastos, formData.tipoDocumento]);

  const filteredGastos = useMemo(() => {
    return (gastos || [])
      .filter((g) => {
        if (selectedCategory !== 'Todas' && g.categoria !== selectedCategory) return false;
        if (selectedDocType !== 'Todos' && g.tipoDocumento !== selectedDocType) return false;
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          return (
            String(g.descripcion || '').toLowerCase().includes(q) ||
            String(g.razonSocial || '').toLowerCase().includes(q) ||
            String(g.rutEmisor || '').toLowerCase().includes(q) ||
            String(g.categoria || '').toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
  }, [gastos, selectedCategory, selectedDocType, searchTerm]);

  const kpis = useMemo(() => {
    let totalBruto = 0;
    let totalNeto = 0;
    let totalIva = 0;
    let ivaCreditoFiscal = 0;
    let facturasCount = 0;

    filteredGastos.forEach((g) => {
      const t = Number(g.total) || 0;
      const n = Number(g.neto) || 0;
      const i = Number(g.iva) || 0;
      totalBruto += t;
      totalNeto += n;
      totalIva += i;
      if (g.tipoDocumento === 'Factura Electrónica') {
        facturasCount++;
        ivaCreditoFiscal += i;
      }
    });

    return {
      totalBruto,
      totalNeto,
      totalIva,
      ivaCreditoFiscal,
      facturasCount,
      count: filteredGastos.length
    };
  }, [filteredGastos]);

  const openNewExpenseModal = () => {
    setEditingId(null);
    setScanProviderBadge('');
    setScanError('');
    setFormData({
      ...EMPTY_FORM,
      fecha: new Date().toISOString().split('T')[0]
    });
    setIsModalOpen(true);
  };

  const openEditExpenseModal = (gasto) => {
    setEditingId(gasto.id);
    setScanProviderBadge('');
    setScanError('');
    setFormData({
      fecha: gasto.fecha || new Date().toISOString().split('T')[0],
      tipoDocumento: gasto.tipoDocumento || 'Boleta Electrónica',
      rutEmisor: gasto.rutEmisor || '',
      razonSocial: gasto.razonSocial || '',
      categoria: gasto.categoria || 'Otros Gastos',
      descripcion: gasto.descripcion || '',
      total: gasto.total ?? '',
      neto: gasto.neto ?? '',
      iva: gasto.iva ?? '',
      comprobanteImg: gasto.comprobanteImg || '',
      nombreArchivo: gasto.nombreArchivo || ''
    });
    setIsModalOpen(true);
  };

  /**
   * Procesa la imagen real seleccionada o capturada y la envía a Google Gemini 2.0 Flash.
   * Si ocurre un error de API o falta la clave, muestra el error real sin rellenar datos ficticios.
   */
  const handleReceiptFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsScanning(true);
      setScanProviderBadge('');
      setScanError('');

      // 1. Comprimir y obtener Base64 para adjuntar al registro y enviar a Gemini 2.0 Flash
      const compressedBase64 = await compressReceiptImage(file);
      const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';

      // Asociar la imagen original capturada al registro
      setFormData((prev) => ({
        ...prev,
        comprobanteImg: compressedBase64,
        nombreArchivo: file.name
      }));

      // 2. Llamar a Google Gemini 2.0 Flash Vision
      const extracted = await scanReceiptWithAI({
        imageBase64: compressedBase64,
        mimeType
      });

      // 3. Auto-rellenado reactivo instantáneo con los datos reales de la imagen
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

      setScanProviderBadge(extracted.provider || 'gemini-2.0-flash');
      addToast(
        `Comprobante analizado con Gemini 2.0 Flash (${extracted.razonSocial || extracted.tipoDocumento} • ${formatCurrency(extracted.total)})`,
        'success'
      );
    } catch (error) {
      console.error('Error escaneando boleta con Gemini:', error);
      const msg = error?.message || 'No se pudo conectar con Gemini para analizar la imagen.';
      setScanError(msg);
      addToast(msg, 'error');
    } finally {
      setIsScanning(false);
      if (e.target) e.target.value = '';
    }
  };

  /**
   * Recalcula Neto e IVA en tiempo real cuando el usuario edita el Monto Total o el Tipo de Documento
   */
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
    const suggestedCat = classifyCategoryFromText(`${val} ${formData.descripcion}`);
    setFormData((prev) => ({
      ...prev,
      razonSocial: val,
      categoria: suggestedCat !== 'Otros Gastos' ? suggestedCat : prev.categoria
    }));
  };

  const handleSaveExpense = (e) => {
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

    const record = {
      id: editingId || `GAS-${Date.now().toString().slice(-5)}`,
      fecha: formData.fecha || new Date().toISOString().split('T')[0],
      tipoDocumento: formData.tipoDocumento,
      rutEmisor: formData.rutEmisor.trim(),
      razonSocial: formData.razonSocial.trim() || 'Proveedor General',
      categoria: formData.categoria,
      descripcion:
        formData.descripcion.trim() ||
        `${formData.razonSocial.trim() || 'Gasto'} — ${formData.categoria}`,
      total: totalNum,
      neto: netoNum,
      iva: ivaNum,
      comprobanteImg: formData.comprobanteImg || '',
      nombreArchivo: formData.nombreArchivo || ''
    };

    if (editingId) {
      setGastos((prev) => prev.map((g) => (g.id === editingId ? record : g)));
      addToast('Gasto actualizado correctamente.', 'success');
    } else {
      setGastos((prev) => [record, ...prev]);
      addToast('Gasto registrado con su comprobante contable.', 'success');
    }

    setIsModalOpen(false);
  };

  const handleDeleteExpense = (id) => {
    if (!window.confirm('¿Eliminar este registro de gasto?')) return;
    setGastos((prev) => prev.filter((g) => g.id !== id));
    addToast('Registro de gasto eliminado.', 'info');
  };

  const handleExportExcel = () => {
    if (filteredGastos.length === 0) {
      addToast('No hay gastos para exportar en el filtro actual.', 'warning');
      return;
    }

    const rows = filteredGastos.map((g) => ({
      'ID Gasto': g.id,
      'Fecha Emisión': g.fecha,
      'Tipo Documento': g.tipoDocumento,
      'RUT Emisor': g.rutEmisor || 'S/I',
      'Proveedor / Razón Social': g.razonSocial,
      'Categoría Contable': g.categoria,
      'Descripción / Glosa': g.descripcion,
      'Monto Neto (CLP)': Number(g.neto) || 0,
      'IVA 19% (CLP)': Number(g.iva) || 0,
      'Total Bruto (CLP)': Number(g.total) || 0,
      'Comprobante Adjunto': g.comprobanteImg ? `Sí (${g.nombreArchivo || 'Imagen capturada'})` : 'Sin adjunto'
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rendicion_Gastos');
    const fileDate = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `EcoSilence_Gastos_Contables_${fileDate}.xlsx`);
    addToast('Reporte contable exportado a Excel (.xlsx).', 'success');
  };

  const handleSaveApiKeys = (e) => {
    e.preventDefault();
    if (geminiApiKey.trim()) {
      localStorage.setItem('ecosilence_gemini_api_key', geminiApiKey.trim());
      setScanError('');
      addToast('API Key de Google Gemini 2.0 Flash guardada correctamente.', 'success');
    } else {
      localStorage.removeItem('ecosilence_gemini_api_key');
      addToast('API Key local eliminada (se usará GEMINI_API_KEY del servidor si existe).', 'info');
    }
    setIsApiKeyModalOpen(false);
  };

  const getCategoryBadgeStyle = (cat = '') => {
    const lower = String(cat).toLowerCase();
    if (lower.includes('transporte') || lower.includes('bencina')) {
      return { background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' };
    }
    if (lower.includes('alimenta') || lower.includes('viático') || lower.includes('viatico')) {
      return { background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24' };
    }
    if (lower.includes('insumo') || lower.includes('herramienta') || lower.includes('manten')) {
      return { background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' };
    }
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
          <h1 style={{ marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            Control de Gastos y Rendiciones
            <span
              style={{
                fontSize: '0.75rem',
                padding: '0.2rem 0.6rem',
                borderRadius: '999px',
                background: 'rgba(99, 102, 241, 0.18)',
                color: '#818cf8',
                fontWeight: 600
              }}
            >
              Gemini 2.0 Flash OCR
            </span>
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Escaneo inteligente de boletas, facturas electrónicas SII y vouchers con extracción tributaria en vivo.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            className="btn btn-ghost"
            onClick={() => setIsApiKeyModalOpen(true)}
            title="Configurar API Key de Google Gemini 2.0 Flash"
          >
            <KeyRound size={17} /> Motor IA (Gemini Key)
          </button>

          <button className="btn btn-ghost" onClick={handleExportExcel}>
            <FileSpreadsheet size={18} color="var(--color-basil)" /> Exportar Excel
          </button>

          <button className="btn btn-primary" onClick={openNewExpenseModal}>
            <Plus size={18} /> Registrar Nuevo Gasto
          </button>
        </div>
      </div>

      {/* KPIs Tributarios */}
      <div className="responsive-grid-cards">
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', padding: '1.2rem' }}>
          <div style={{ background: 'var(--color-tomato-bg)', padding: '0.8rem', borderRadius: '50%', color: 'var(--color-tomato)' }}>
            <DollarSign size={24} />
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.2rem' }}>
              Total Gastos ({kpis.count})
            </p>
            <h2 style={{ fontSize: '1.4rem' }}>{formatCurrency(kpis.totalBruto)}</h2>
            <p className="text-xs text-slate-400" style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
              Neto: {formatCurrency(kpis.totalNeto)} | IVA (19%): {formatCurrency(kpis.totalIva)}
            </p>
          </div>
        </div>

        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', padding: '1.2rem' }}>
          <div style={{ background: 'var(--color-basil-bg)', padding: '0.8rem', borderRadius: '50%', color: 'var(--color-basil)' }}>
            <Receipt size={24} />
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.2rem' }}>
              IVA Crédito Fiscal ({kpis.facturasCount} Facturas)
            </p>
            <h2 style={{ fontSize: '1.4rem' }}>{formatCurrency(kpis.ivaCreditoFiscal)}</h2>
            <p className="text-xs text-slate-400" style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
              Recuperable ante SII (19%)
            </p>
          </div>
        </div>

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
      </div>

      {/* Tabla y Filtros */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div
          style={{
            display: 'flex',
            gap: '1rem',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div className="search-bar" style={{ width: '100%', maxWidth: '340px' }}>
            <Search size={18} />
            <input
              type="text"
              placeholder="Buscar por comercio, RUT o glosa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'var(--bg-dark)',
                padding: '0.45rem 0.9rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)'
              }}
            >
              <Filter size={15} color="var(--text-muted)" />
              <select
                className="input-control"
                style={{ border: 'none', background: 'transparent', padding: 0, fontSize: '0.88rem' }}
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

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'var(--bg-dark)',
                padding: '0.45rem 0.9rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)'
              }}
            >
              <Receipt size={15} color="var(--text-muted)" />
              <select
                className="input-control"
                style={{ border: 'none', background: 'transparent', padding: 0, fontSize: '0.88rem' }}
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
                  <td colSpan={10} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    No hay gastos registrados aún. Haz clic en "+ Registrar Nuevo Gasto" para escanear una boleta con IA.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: + Registrar Nuevo Gasto con Auto-Escaneo IA (Google Gemini 2.0 Flash) */}
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
                  <Receipt size={22} color="var(--accent-primary)" />
                  {editingId ? 'Editar Registro de Gasto' : '+ Registrar Nuevo Gasto'}
                </h2>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Escanea una boleta o factura real con Gemini 2.0 Flash para autocompletar los campos.
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
                      Google Gemini 2.0 Flash Vision (SII Chile)
                      <Sparkles size={14} color="#fbbf24" />
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Extrae comercio real, RUT, fecha y calcula Neto + IVA (19%) directamente de tu foto.
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

              {/* Alerta de error real de conexión / API Key */}
              {scanError && !isScanning && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.8rem',
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(239, 68, 68, 0.14)',
                    border: '1px solid var(--color-tomato)',
                    color: '#fca5a5',
                    fontSize: '0.83rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1 }}>
                    <AlertTriangle size={18} color="var(--color-tomato)" style={{ flexShrink: 0 }} />
                    <span>{scanError}</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{
                      padding: '0.35rem 0.75rem',
                      fontSize: '0.78rem',
                      borderColor: 'rgba(239, 68, 68, 0.4)',
                      color: '#fff'
                    }}
                    onClick={() => setIsApiKeyModalOpen(true)}
                  >
                    <KeyRound size={14} /> Configurar API Key
                  </button>
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
                    <Building2 size={14} /> Razón Social / Proveedor
                  </label>
                  <input
                    type="text"
                    className="input-control"
                    placeholder="Nombre del comercio extraído de la boleta"
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
                  <Tag size={14} /> Categoría Contable (Auto-clasificada por giro)
                </label>
                <input
                  type="text"
                  list="expense-categories-list"
                  className="input-control"
                  placeholder="Ej: Gimnasio/Fitness, Transporte / Bencina, Alimentación..."
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
                  disabled={isScanning}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={isScanning}>
                  Guardar Gasto
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

      {/* MODAL: Configurar API Key de Google Gemini 2.0 Flash */}
      {isApiKeyModalOpen && (
        <div className="modal-overlay" onClick={() => setIsApiKeyModalOpen(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: '500px', padding: '1.8rem' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <KeyRound size={20} color="var(--accent-primary)" /> Configurar Google Gemini 2.0 Flash
              </h3>
              <button className="btn btn-ghost" style={{ padding: '0.4rem' }} onClick={() => setIsApiKeyModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '1.2rem' }}>
              El escáner utiliza <code>gemini-2.0-flash</code> leyendo <code>process.env.GEMINI_API_KEY</code> en el
              servidor o la clave que guardes aquí en tu navegador:
            </p>
            <form onSubmit={handleSaveApiKeys}>
              <div className="input-group">
                <label className="input-label">Google Gemini API Key (GEMINI_API_KEY)</label>
                <input
                  type="password"
                  className="input-control"
                  placeholder="AIzaSy..."
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.2rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setIsApiKeyModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Guardar API Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GastosView;
