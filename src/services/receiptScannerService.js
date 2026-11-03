/**
 * Receipt Scanner Service (OCR Real con Google Gemini - SII Chile)
 * Envía siempre la imagen en Base64 directamente a POST /api/expenses/scan-receipt
 * sin bloqueos ni validaciones previas de localStorage en el cliente.
 */

export const EXPENSE_DOC_TYPES = [
  'Boleta Electrónica',
  'Factura Electrónica',
  'Voucher Transbank',
  'Transferencia',
  'Comprobante de Transferencia'
];

export const EXPENSE_CATEGORIES = [
  'Gimnasio/Fitness',
  'Transporte / Bencina',
  'Alimentación / Viáticos',
  'Insumos Técnicos / Mantenimiento',
  'Herramientas / Ferretería',
  'Servicios / Suscripciones',
  'Otros Gastos'
];

export const CHILEAN_TAX_SYSTEM_PROMPT = `Eres un auditor contable experto en Chile (SII). Analiza la imagen del comprobante y extrae en formato JSON estricto:
- razonSocial: Nombre real del comercio o empresa visible en la imagen.
- rutEmisor: RUT del emisor visible (formato XX.XXX.XXX-X).
- tipoDoc: Clasificar entre 'Boleta Electrónica', 'Factura Electrónica', 'Voucher Transbank' o 'Transferencia'.
- fecha: Fecha del comprobante en formato YYYY-MM-DD.
- montoTotal: Número entero en CLP.
- montoNeto: Si aparece en el ticket úsalo; si solo aparece el total, calcular Math.round(montoTotal / 1.19).
- iva: Si aparece en el ticket úsalo; si no, calcular montoTotal - montoNeto.
- categoria: Clasificar según el giro (Gimnasio/Fitness, Bencina/Transporte, Alimentación, Herramientas, etc.).
- descripcion: Breve resumen real de los ítems o concepto visible en el comprobante.`;

const SPANISH_MONTHS = {
  enero: '01', ene: '01',
  febrero: '02', feb: '02',
  marzo: '03', mar: '03',
  abril: '04', abr: '04',
  mayo: '05', may: '05',
  junio: '06', jun: '06',
  julio: '07', jul: '07',
  agosto: '08', ago: '08',
  septiembre: '09', sept: '09', setiembre: '09', sep: '09', set: '09',
  octubre: '10', oct: '10',
  noviembre: '11', nov: '11',
  diciembre: '12', dic: '12'
};

export const parseCLPAmount = (val) => {
  if (typeof val === 'number' && !Number.isNaN(val)) {
    return Math.max(0, Math.round(val));
  }
  if (typeof val === 'string') {
    const cleaned = val.replace(/[^0-9]/g, '');
    return cleaned ? Math.max(0, parseInt(cleaned, 10)) : 0;
  }
  return 0;
};

export const normalizeChileanDate = (rawDate) => {
  const today = new Date().toISOString().split('T')[0];
  if (!rawDate) return today;

  const str = String(rawDate).trim();

  const isoMatch = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (isoMatch) {
    const [, yyyy, mm, dd] = isoMatch;
    const m = Number(mm);
    const d = Number(dd);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${yyyy}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  const dmyMatch = str.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (dmyMatch) {
    let [, dd, mm, yy] = dmyMatch;
    const yearNum = yy.length === 2 ? 2000 + parseInt(yy, 10) : parseInt(yy, 10);
    const m = parseInt(mm, 10);
    const d = parseInt(dd, 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && yearNum >= 2000 && yearNum <= 2100) {
      return `${yearNum}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  const textMatch = str
    .toLowerCase()
    .match(/(\d{1,2})\s*(?:de|-|\s)\s*([a-záéíóú]+)\s*(?:de|del|-|,|\s)?\s*(\d{2,4})/);
  if (textMatch) {
    const [, dd, monthWord, yy] = textMatch;
    const monthCode = SPANISH_MONTHS[monthWord];
    if (monthCode) {
      const yearNum = yy.length === 2 ? 2000 + parseInt(yy, 10) : parseInt(yy, 10);
      const d = parseInt(dd, 10);
      if (d >= 1 && d <= 31) {
        return `${yearNum}-${monthCode}-${String(d).padStart(2, '0')}`;
      }
    }
  }

  return today;
};

export const classifyCategoryFromText = (text = '') => {
  const normalized = String(text).toLowerCase();

  if (/gimnasio|smartfit|smart fit|sportlife|energy|fitness|entrenamiento|deporte/.test(normalized)) {
    return 'Gimnasio/Fitness';
  }
  if (/copec|shell|petrobras|aramco|bencina|combustible|diesel|peaje|tag|uber|cabify|transporte/.test(normalized)) {
    return 'Transporte / Bencina';
  }
  if (/restauran|cafeter|cafe|starbucks|supermercado|lider|jumbo|unimarc|almuerzo|colacion|viatico|comida/.test(normalized)) {
    return 'Alimentación / Viáticos';
  }
  if (/audio|ferreter|sodimac|easy|casa royal|audiomusica|pcfactory|cables|xlr|transmisor|audifono|bateria|tecnolog|herramienta/.test(normalized)) {
    return 'Insumos Técnicos / Mantenimiento';
  }
  return 'Otros Gastos';
};

export const calculateTaxBreakdown = (totalBruto, tipoDocumento = 'Boleta Electrónica', isExplicitlyExempt = false) => {
  const total = parseCLPAmount(totalBruto);
  if (total === 0) return { total: 0, neto: 0, iva: 0 };

  if (isExplicitlyExempt) {
    return { total, neto: total, iva: 0 };
  }

  const neto = Math.round(total / 1.19);
  const iva = total - neto;
  return { total, neto, iva };
};

export const normalizeReceiptResponse = (raw = {}) => {
  const rawDoc = String(raw.tipoDoc || raw.tipoDocumento || '').trim();
  let tipoDocumento = 'Boleta Electrónica';
  const lowerDoc = rawDoc.toLowerCase();
  if (lowerDoc.includes('factura')) {
    tipoDocumento = 'Factura Electrónica';
  } else if (lowerDoc.includes('transbank') || lowerDoc.includes('redelcom') || lowerDoc.includes('voucher')) {
    tipoDocumento = 'Voucher Transbank';
  } else if (lowerDoc.includes('transferencia')) {
    tipoDocumento = 'Transferencia';
  } else if (rawDoc) {
    tipoDocumento = rawDoc;
  }

  const total = parseCLPAmount(raw.montoTotal ?? raw.total);
  let neto = parseCLPAmount(raw.montoNeto ?? raw.neto);
  let iva = parseCLPAmount(raw.iva);

  const isExplicitlyExempt =
    raw.exento === true &&
    /exent[oa]|no afecta/i.test(`${rawDoc} ${raw.descripcion || ''}`);

  if (total > 0) {
    if (isExplicitlyExempt) {
      neto = total;
      iva = 0;
    } else if (!neto || !iva || neto <= 0 || iva <= 0 || neto >= total) {
      neto = Math.round(total / 1.19);
      iva = total - neto;
    }
  } else if (neto > 0 && (!iva || iva <= 0)) {
    iva = Math.round(neto * 0.19);
  }

  const razonSocial = String(raw.razonSocial || '').trim();
  const detalle = String(raw.descripcion || raw.resumenItems || '').trim();
  const descripcion =
    razonSocial && detalle && !detalle.toLowerCase().includes(razonSocial.toLowerCase())
      ? `${razonSocial} — ${detalle}`
      : detalle || razonSocial || 'Comprobante escaneado';

  const categoria = String(raw.categoria || '').trim() || classifyCategoryFromText(`${razonSocial} ${descripcion}`);
  const fecha = normalizeChileanDate(raw.fecha);

  return {
    razonSocial,
    rutEmisor: String(raw.rutEmisor || '').trim(),
    tipoDoc: tipoDocumento,
    tipoDocumento,
    fecha,
    montoTotal: total || (neto + iva),
    montoNeto: neto,
    total: total || (neto + iva),
    neto,
    iva,
    categoria,
    descripcion
  };
};

export const compressReceiptImage = (file, maxWidth = 1200, quality = 0.85) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const outputMime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const compressedBase64 = canvas.toDataURL(outputMime, quality);
        resolve(compressedBase64);
      };
      img.onerror = () => reject(new Error('No se pudo leer la imagen seleccionada.'));
      img.src = event.target.result;
    };
    reader.onerror = () => reject(new Error('Error al cargar el archivo de imagen.'));
    reader.readAsDataURL(file);
  });
};

/**
 * Envía la imagen en Base64 directamente mediante POST a /api/expenses/scan-receipt
 * sin verificar localStorage ni mostrar alertas previas en el cliente.
 */
export const scanReceiptWithAI = async ({ imageBase64, mimeType = 'image/jpeg' }) => {
  if (!imageBase64) {
    throw new Error('No se proporcionó ninguna imagen para escanear.');
  }

  const detectedMime =
    imageBase64.match(/^data:([^;]+);base64,/)?.[1] || mimeType || 'image/jpeg';

  const serverResp = await fetch('/api/expenses/scan-receipt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageBase64,
      mimeType: detectedMime
    })
  });

  const serverJson = await serverResp.json();

  if (!serverResp.ok || !serverJson?.ok) {
    throw new Error(
      serverJson?.error || `Error al procesar el comprobante (${serverResp.status}).`
    );
  }

  return {
    ...normalizeReceiptResponse(serverJson.data),
    provider: serverJson.provider || 'gemini'
  };
};
