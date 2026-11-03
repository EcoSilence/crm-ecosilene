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
  Download
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

const INITIAL_SAMPLE_EXPENSES = [
  {
    id: 'GAS-1001',
    fecha: '2026-11-01',
    tipoDocumento: 'Factura Electrónica',
    rutEmisor: '99.520.000-7',
    razonSocial: 'COPEC S.A.',
    categoria: 'Transporte / Bencina',
    descripcion: 'COPEC S.A. — Carga combustible traslado equipos evento Vitacura',
    total: 45000,
    neto: 37815,
    iva: 7185,
    comprobanteImg: '',
    nombreArchivo: 'factura_copec_vitacura.jpg'
  },
  {
    id: 'GAS-1002',
    fecha: '2026-11-02',
    tipoDocumento: 'Factura Electrónica',
    rutEmisor: '96.792.430-K',
    razonSocial: 'Sodimac Homecenter S.A.',
    categoria: 'Insumos Técnicos / Mantenimiento',
    descripcion: 'Sodimac Homecenter S.A. — Extensiones eléctricas, adaptadores y cinta gaffer',
    total: 54990,
    neto: 46210,
    iva: 8780,
    comprobanteImg: '',
    nombreArchivo: 'factura_sodimac_insumos.jpg'
  }
];

const EMPTY_FORM = {
  fecha: new Date().toISOString().split('T')[0],
  tipoDocumento: 'Boleta Electrónica',
  rutEmisor: '',
  razonSocial: '',
  categoria: 'Insumos Técnicos / Mantenimiento',
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
      return saved ? JSON.parse(saved) : INITIAL_SAMPLE_EXPENSES;
    } catch {
      return INITIAL_SAMPLE_EXPENSES;
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

  // Modal de previsualización de comprobante
  const [previewExpense, setPreviewExpense] = useState(null);

  // Modal opcional para configurar API Key de Gemini / OpenAI
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState(
    () => localStorage.getItem('ecosilence_gemini_api_key') || ''
  );
  const [openaiApiKey, setOpenaiApiKey] = useState(
    () => localStorage.getItem('ecosilence_openai_api_key') || ''
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
    setFormData({
      ...EMPTY_FORM,
      fecha: new Date().toISOString().split('T')[0]
    });
    setIsModalOpen(true);
  };

  const openEditExpenseModal = (gasto) => {
    setEditingId(gasto.id);
    setScanProviderBadge('');
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
   * Procesa la imagen seleccionada o capturada por cámara, ejecuta el OCR con IA Multimodal
   * y auto-rellena de forma reactiva todos los campos del formulario.
   */
  const handleReceiptFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsScanning(true);
      setScanProviderBadge('');

      // 1. Comprimir y obtener Base64 para adjuntar al registro y enviar a Vision AI
      const compressedBase64 = await compressReceiptImage(file);

      // Mostrar de inmediato la previsualización del comprobante mientras la IA analiza
      setFormData((prev) => ({
        ...prev,
        comprobanteImg: compressedBase64,
        nombreArchivo: file.name
      }));

      // 2. Llamar al servicio Vision AI (/api/expenses/scan-receipt o proveedor multimodal)
      const extracted = await scanReceiptWithAI({
        imageBase64: compressedBase64,
        fileName: file.name,
        mimeType: 'image/jpeg'
      });

      // 3. Auto-rellenado reactivo instantáneo del formulario
      setFormData((prev) => ({
        ...prev,
        fecha: extracted.fecha || prev.fecha,
        tipoDocumento: extracted.tipoDocumento || prev.tipoDocumento,
        rutEmisor: extracted.rutEmisor || prev.rutEmisor,
        razonSocial: extracted.razonSocial || prev.razonSocial,
        categoria: extracted.categoria || prev.categoria,
        descripcion: extracted.descripcion || prev.descripcion,
        total: extracted.total,
        neto: extracted.neto,
        iva: extracted.iva,
        comprobanteImg: compressedBase64,
        nombreArchivo: file.name
      }));

      setScanProviderBadge(extracted.provider || 'vision-ai');
      addToast(
        `Comprobante analizado con éxito (${extracted.tipoDocumento} • ${formatCurrency(extracted.total)})`,
        'success'
      );
    } catch (error) {
      console.error('Error escaneando boleta con IA:', error);
      addToast('No se pudo analizar automáticamente el documento. Puedes completar los campos manualmente.', 'warning');
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
      formData.neto !== ''
        ? Math.round(Number(formData.neto) || 0)
        : calculateTaxBreakdown(totalNum, formData.tipoDocumento).neto;
    const ivaNum =
      formData.iva !== ''
        ? Math.round(Number(formData.iva) || 0)
        : calculateTaxBreakdown(totalNum, formData.tipoDocumento).iva;

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

  /**
   * Exporta los gastos filtrados a un archivo Excel (.xlsx) incluyendo estado y referencia del comprobante
   */
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
    } else {
      localStorage.removeItem('ecosilence_gemini_api_key');
    }
    if (openaiApiKey.trim()) {
      localStorage.setItem('ecosilence_openai_api_key', openaiApiKey.trim());
    } else {
      localStorage.removeItem('ecosilence_openai_api_key');
    }
    setIsApiKeyModalOpen(false);
    addToast('Credenciales de Vision AI guardadas correctamente.', 'success');
  };

  const getCategoryBadgeStyle = (cat) => {
    switch (cat) {
      case 'Transporte / Bencina':
        return { background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' };
      case 'Alimentación / Viáticos':
        return { background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24' };
      case 'Insumos Técnicos / Mantenimiento':
        return { background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' };
      default:
        return { background: 'rgba(148, 163, 184, 0.15)', color: '#cbd5e1' };
    }
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
              OCR Vision AI
            </span>
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Escaneo inteligente de boletas, facturas electrónicas SII y vouchers con extracción tributaria automática.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            className="btn btn-ghost"
            onClick={() => setIsApiKeyModalOpen(true)}
            title="Configurar API Key de Gemini Flash o GPT-4o-mini"
          >
            <KeyRound size={17} /> Motor IA
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
                {EXPENSE_CATEGORIES.map((c) => (
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
                {EXPENSE_DOC_TYPES.map((d) => (
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
                    No se encontraron registros de gastos para los filtros seleccionados.
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
                  <Receipt size={22} color="var(--accent-primary)" />
                  {editingId ? 'Editar Registro de Gasto' : '+ Registrar Nuevo Gasto'}
                </h2>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Escanea una boleta o factura con IA para autocompletar los campos o edítalos manualmente.
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
                      Lectura Tributaria Automática (SII Chile)
                      <Sparkles size={14} color="#fbbf24" />
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Detecta Boleta, Factura, Transbank o Transferencia y desglosa Neto + IVA (19%).
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                  {/* Input oculto para subir archivo / galería */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleReceiptFileSelected}
                  />
                  {/* Input oculto para tomar foto directa desde cámara del celular */}
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

              {/* Estado de carga visual requerido */}
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
                    {EXPENSE_DOC_TYPES.map((docType) => (
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
                    placeholder="Ej: COPEC S.A., Sodimac, Casa Royal..."
                    value={formData.razonSocial}
                    onChange={(e) => handleRazonSocialChange(e.target.value)}
                  />
                </div>

                <div className="input-group" style={{ marginBottom: '0.8rem' }}>
                  <label className="input-label">RUT del Emisor</label>
                  <input
                    type="text"
                    className="input-control"
                    placeholder="Ej: 76.123.456-7"
                    value={formData.rutEmisor}
                    onChange={(e) => setFormData((prev) => ({ ...prev, rutEmisor: e.target.value }))}
                  />
                </div>
              </div>

              <div className="input-group" style={{ marginBottom: '0.8rem' }}>
                <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Tag size={14} /> Categoría Contable (Auto-clasificada)
                </label>
                <select
                  className="input-control"
                  value={formData.categoria}
                  onChange={(e) => setFormData((prev) => ({ ...prev, categoria: e.target.value }))}
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="input-group" style={{ marginBottom: '1rem' }}>
                <label className="input-label">Descripción (Razón Social + Resumen de Ítems)</label>
                <input
                  type="text"
                  className="input-control"
                  required
                  placeholder="Ej: Sodimac Homecenter S.A. — Cables eléctricos y cinta gaffer"
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

      {/* MODAL OPCIONAL: Configurar API Key de Vision AI */}
      {isApiKeyModalOpen && (
        <div className="modal-overlay" onClick={() => setIsApiKeyModalOpen(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: '500px', padding: '1.8rem' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <KeyRound size={20} color="var(--accent-primary)" /> Configurar Motor Vision AI
              </h3>
              <button className="btn btn-ghost" style={{ padding: '0.4rem' }} onClick={() => setIsApiKeyModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '1.2rem' }}>
              El endpoint <code>/api/expenses/scan-receipt</code> utiliza las variables de entorno del servidor (
              <code>GEMINI_API_KEY</code> o <code>OPENAI_API_KEY</code>). También puedes ingresar una clave aquí para uso
              directo desde tu navegador:
            </p>
            <form onSubmit={handleSaveApiKeys}>
              <div className="input-group">
                <label className="input-label">Google Gemini API Key (Gemini 2.0 Flash)</label>
                <input
                  type="password"
                  className="input-control"
                  placeholder="AIzaSy..."
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                />
              </div>
              <div className="input-group">
                <label className="input-label">OpenAI API Key (GPT-4o-mini JSON Vision)</label>
                <input
                  type="password"
                  className="input-control"
                  placeholder="sk-..."
                  value={openaiApiKey}
                  onChange={(e) => setOpenaiApiKey(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.2rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setIsApiKeyModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Guardar Claves
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

