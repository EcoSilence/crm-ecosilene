/**
 * Vercel Serverless API Route: POST /api/expenses/scan-receipt
 * Escaneo inteligente de boletas, facturas y comprobantes chilenos (SII / Transbank / Redelcom)
 * usando IA Multimodal (Gemini Flash o OpenAI GPT-4o-mini con JSON estructurado).
 */

export const CHILEAN_TAX_SYSTEM_PROMPT = `Eres un contador auditor experto en tributación chilena (SII - Servicio de Impuestos Internos).
Tu tarea es analizar la imagen de un documento tributario o comprobante de pago chileno y extraer sus datos estructurados en formato JSON estricto.

REGLAS ESTRICTAS DE EXTRACCIÓN TRIBUTARIA (CHILE - SII):

1. "tipoDocumento": Clasifica obligatoriamente en uno de estos 4 valores exactos:
   - "Boleta Electrónica"
   - "Factura Electrónica"
   - "Voucher Transbank" (incluye vouchers Transbank, Redelcom, Getnet, Compraquí o POS)
   - "Comprobante de Transferencia"

2. REGLA DE NORMALIZACIÓN DE FECHA ("fecha"):
   - Busca la fecha de emisión o transacción en el documento.
   - Si la fecha aparece como DD/MM/AAAA (ej. 03/11/2026), DD-MM-AA (ej. 03-11-26), DD/MM/AA, o en texto en español (ej. "03 de Noviembre de 2026", "03 NOV 2026"), conviértela OBLIGATORIAMENTE al formato ISO "AAAA-MM-DD" (ej. "2026-11-03").
   - Si la fecha es ilegible o no aparece en la imagen, utiliza como fallback la fecha actual del sistema en formato "AAAA-MM-DD".

3. "rutEmisor" y "razonSocial":
   - Extrae el RUT del comercio/emisor en formato chileno (ej. "76.123.456-7"). Si no es visible, devuelve "".
   - Extrae el nombre comercial o Razón Social del proveedor/comercio.

4. REGLA DE IVA PARA CHILE (SII) ("total", "neto", "iva", "exento"):
   - Todos los montos deben ser números enteros en Pesos Chilenos ($ CLP), sin puntos ni símbolos de moneda.
   - Si el documento es "Factura Electrónica" y muestra explícitamente el desglose de IVA (19%), extrae ese valor exacto de IVA y el monto Neto indicado.
   - Si el documento es "Boleta Electrónica", "Voucher Transbank" (Transbank / Redelcom / POS) o ticket de consumo donde solo aparece el "TOTAL", DEBES asumir que el IVA del 19% ya está incluido en el Total y calcular matemáticamente:
     * neto = Math.round(total / 1.19)
     * iva = total - neto
   - NUNCA devuelvas "iva" en 0 o null a menos que el documento declare explícitamente en su texto ser "Exento de IVA" ("BOLETA NO AFECTA O EXENTA ELECTRÓNICA" / "FACTURA NO AFECTA O EXENTA").
   - "exento": true ÚNICAMENTE si el documento declara explícitamente en el texto ser "Exento de IVA"; en cualquier otro caso devuelve false.

5. "categoria": Auto-clasifica la categoría contable según el comercio:
   - Si es Copec, Shell, Petrobras, Aramco, bencina, peaje o TAG -> "Transporte / Bencina"
   - Si es restaurante, cafetería o supermercado -> "Alimentación / Viáticos"
   - Si es audio, ferretería, cables o tecnología -> "Insumos Técnicos / Mantenimiento"
   - Si no encaja en las anteriores -> "Otros Gastos"

Responde ÚNICAMENTE con un objeto JSON válido con la siguiente estructura exacta:
{
  "tipoDocumento": "Boleta Electrónica",
  "fecha": "2026-11-03",
  "rutEmisor": "76.543.210-K",
  "razonSocial": "Nombre del Comercio",
  "resumenItems": "Resumen corto de ítems",
  "descripcion": "Nombre del Comercio — Resumen corto de ítems",
  "categoria": "Insumos Técnicos / Mantenimiento",
  "total": 119000,
  "neto": 100000,
  "iva": 19000,
  "exento": false,
  "confianza": 0.98
}`;

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

/**
 * Convierte cualquier valor numérico o string formateado en CLP (ej. "$45.990", "45.990", 45990) a entero
 */
export function parseCLPAmount(val) {
  if (typeof val === 'number' && !Number.isNaN(val)) {
    return Math.max(0, Math.round(val));
  }
  if (typeof val === 'string') {
    const cleaned = val.replace(/[^0-9]/g, '');
    return cleaned ? Math.max(0, parseInt(cleaned, 10)) : 0;
  }
  return 0;
}

/**
 * Normaliza fechas en formatos chilenos (DD/MM/AAAA, DD-MM-AA, texto en español) a ISO 'AAAA-MM-DD'
 */
export function normalizeChileanDate(rawDate) {
  const today = new Date().toISOString().split('T')[0];
  if (!rawDate) return today;

  const str = String(rawDate).trim();

  // 1. Ya está en formato ISO AAAA-MM-DD (o con timestamp)
  const isoMatch = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (isoMatch) {
    const [, yyyy, mm, dd] = isoMatch;
    const m = Number(mm);
    const d = Number(dd);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${yyyy}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  // 2. Formato DD/MM/AAAA o DD-MM-AA o DD.MM.AAAA
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

  // 3. Fecha en texto español (ej. "03 de Noviembre 2026", "3 nov 26", "03-nov-2026")
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
}

/**
 * Normaliza y valida los montos e información devuelta por el modelo de visión
 * aplicando el cálculo de respaldo obligatorio de Neto e IVA (19% Chile).
 */
export function normalizeExtractedReceipt(raw = {}) {
  const validDocTypes = [
    'Boleta Electrónica',
    'Factura Electrónica',
    'Voucher Transbank',
    'Comprobante de Transferencia'
  ];

  const validCategories = [
    'Transporte / Bencina',
    'Alimentación / Viáticos',
    'Insumos Técnicos / Mantenimiento',
    'Otros Gastos'
  ];

  let tipoDocumento = raw.tipoDocumento;
  if (!validDocTypes.includes(tipoDocumento)) {
    const rawDocLower = String(tipoDocumento || '').toLowerCase();
    if (rawDocLower.includes('factura')) tipoDocumento = 'Factura Electrónica';
    else if (rawDocLower.includes('transbank') || rawDocLower.includes('redelcom') || rawDocLower.includes('voucher'))
      tipoDocumento = 'Voucher Transbank';
    else if (rawDocLower.includes('transferencia')) tipoDocumento = 'Comprobante de Transferencia';
    else tipoDocumento = 'Boleta Electrónica';
  }

  const total = parseCLPAmount(raw.total);
  let neto = parseCLPAmount(raw.neto);
  let iva = parseCLPAmount(raw.iva);

  // Solo se considera exento si el documento declara explícitamente ser Exento de IVA
  const isExplicitlyExempt =
    raw.exento === true &&
    /exent[oa]|no afecta/i.test(
      `${raw.tipoDocumento || ''} ${raw.descripcion || ''} ${raw.resumenItems || ''}`
    );

  // Verificación y fallback obligatorio en el backend:
  // Si total tiene valor pero iva o neto llegan como 0 o undefined (o inconsistentes),
  // aplica el cálculo matemático chileno: neto = Math.round(total / 1.19), iva = total - neto
  if (total > 0) {
    if (isExplicitlyExempt) {
      neto = total;
      iva = 0;
    } else if (!neto || !iva || neto <= 0 || iva <= 0 || neto >= total) {
      neto = Math.round(total / 1.19);
      iva = total - neto;
    }
  } else if (neto > 0) {
    // Si solo llegó neto y no total
    if (!iva || iva <= 0) {
      iva = Math.round(neto * 0.19);
    }
  }

  const razonSocial = String(raw.razonSocial || 'Comercio').trim();
  const resumenItems = String(raw.resumenItems || 'Compra según comprobante').trim();
  const descripcion =
    raw.descripcion && String(raw.descripcion).trim().length > 0
      ? String(raw.descripcion).trim()
      : `${razonSocial} — ${resumenItems}`;

  let categoria = raw.categoria;
  if (!validCategories.includes(categoria)) {
    const lowerText = `${razonSocial} ${resumenItems} ${descripcion}`.toLowerCase();
    if (/copec|shell|petrobras|aramco|bencina|combustible|peaje|tag|uber|cabify/.test(lowerText)) {
      categoria = 'Transporte / Bencina';
    } else if (/restauran|cafe|cafeter|starbucks|supermercado|lider|jumbo|unimarc|colacion|almuerzo|comida/.test(lowerText)) {
      categoria = 'Alimentación / Viáticos';
    } else if (/audio|cable|ferreter|sodimac|easy|casa royal|audiomusica|pcfactory|tecnolog|bateria|pila|transmisor|antena/.test(lowerText)) {
      categoria = 'Insumos Técnicos / Mantenimiento';
    } else {
      categoria = 'Otros Gastos';
    }
  }

  const fecha = normalizeChileanDate(raw.fecha);

  return {
    tipoDocumento,
    fecha,
    rutEmisor: String(raw.rutEmisor || '').trim(),
    razonSocial,
    resumenItems,
    descripcion,
    categoria,
    total: total || (neto + iva),
    neto,
    iva,
    exento: isExplicitlyExempt,
    confianza: Number(raw.confianza) || 0.96
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  try {
    const { imageBase64, imageUrl, mimeType = 'image/jpeg' } = req.body || {};

    if (!imageBase64 && !imageUrl) {
      return res.status(400).json({
        error: 'Se requiere imageBase64 o imageUrl para analizar el documento.'
      });
    }

    const geminiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
    const todayISO = new Date().toISOString().split('T')[0];

    // 1. Proveedor Primario: Google Gemini Flash (Multimodal JSON)
    if (geminiKey) {
      const cleanBase64 = imageBase64
        ? imageBase64.replace(/^data:[^;]+;base64,/, '')
        : null;

      const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;

      const parts = [
        {
          text: `${CHILEAN_TAX_SYSTEM_PROMPT}\n\nFecha actual del sistema (fallback si la fecha es ilegible): ${todayISO}`
        }
      ];
      if (cleanBase64) {
        parts.push({
          inline_data: {
            mime_type: mimeType,
            data: cleanBase64
          }
        });
      } else if (imageUrl) {
        parts.push({ text: `Analiza la imagen del documento en esta URL: ${imageUrl}` });
      }

      const geminiResp = await fetch(geminiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json'
          }
        })
      });

      if (!geminiResp.ok) {
        const errText = await geminiResp.text();
        throw new Error(`Error en Gemini Vision API (${geminiResp.status}): ${errText}`);
      }

      const geminiJson = await geminiResp.json();
      const rawText = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      const parsed = JSON.parse(rawText);
      return res.status(200).json({
        ok: true,
        provider: 'gemini-2.0-flash',
        data: normalizeExtractedReceipt(parsed)
      });
    }

    // 2. Proveedor Secundario: OpenAI GPT-4o-mini Vision con response_format: json_object
    if (openaiKey) {
      const imageContentUrl = imageBase64
        ? (imageBase64.startsWith('data:') ? imageBase64 : `data:${mimeType};base64,${imageBase64}`)
        : imageUrl;

      const openaiResp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          response_format: { type: 'json_object' },
          temperature: 0.1,
          messages: [
            {
              role: 'system',
              content: `${CHILEAN_TAX_SYSTEM_PROMPT}\nFecha actual del sistema (fallback): ${todayISO}`
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Extrae todos los campos tributarios de este documento chileno en JSON. Recuerda calcular Neto = Math.round(Total / 1.19) e IVA = Total - Neto si solo aparece el Total.'
                },
                { type: 'image_url', image_url: { url: imageContentUrl } }
              ]
            }
          ]
        })
      });

      if (!openaiResp.ok) {
        const errText = await openaiResp.text();
        throw new Error(`Error en OpenAI Vision API (${openaiResp.status}): ${errText}`);
      }

      const openaiJson = await openaiResp.json();
      const rawText = openaiJson?.choices?.[0]?.message?.content || '{}';
      const parsed = JSON.parse(rawText);
      return res.status(200).json({
        ok: true,
        provider: 'gpt-4o-mini',
        data: normalizeExtractedReceipt(parsed)
      });
    }

    return res.status(503).json({
      ok: false,
      reason: 'missing_api_key',
      error: 'Configura GEMINI_API_KEY o OPENAI_API_KEY en las variables de entorno del servidor.'
    });
  } catch (error) {
    console.error('[scan-receipt] Error:', error);
    return res.status(500).json({
      ok: false,
      error: error.message || 'Error interno al procesar la boleta/factura con IA.'
    });
  }
}
