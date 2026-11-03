/**
 * Vercel Serverless API Route: POST /api/expenses/scan-receipt
 * Llamada nativa REST a Google Gemini Vision con inlineData (image/jpeg comprimida)
 * y responseMimeType: "application/json".
 */

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

let cachedServerKey = '';

async function resolveServerGeminiKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY.trim();
  if (process.env.VITE_GEMINI_API_KEY) return process.env.VITE_GEMINI_API_KEY.trim();
  if (cachedServerKey) return cachedServerKey;

  const supabaseUrl =
    process.env.VITE_SUPABASE_URL || 'https://aopxqymvcgaklfwqhjjv.supabase.co';
  const supabaseAnonKey =
    process.env.VITE_SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvcHhxeW12Y2dha2xmd3Foamp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NzI3MzQsImV4cCI6MjA5MjU0ODczNH0.BgKxvitxbIn_ZHqu9fZw_1d0IFmSlKuRqOle3n8Ngoc';

  try {
    const resp = await fetch(
      `${supabaseUrl}/rest/v1/configuracion?clave=eq.gemini_api_key&select=valor`,
      {
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`
        }
      }
    );
    if (resp.ok) {
      const rows = await resp.json();
      const val = rows?.[0]?.valor;
      if (val && typeof val === 'string') {
        cachedServerKey = val.trim();
        return cachedServerKey;
      }
    }
  } catch (err) {
    console.warn('[scan-receipt] Error consultando configuracion en Supabase:', err);
  }
  return '';
}

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

export function normalizeChileanDate(rawDate) {
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
}

export function normalizeExtractedReceipt(raw = {}) {
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

  const categoria = String(raw.categoria || 'Otros Gastos').trim();
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
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed. Use POST.' });
  }

  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body || {};

    if (!imageBase64) {
      return res.status(400).json({
        ok: false,
        error: 'No se recibió la imagen del comprobante (imageBase64).'
      });
    }

    const API_KEY = await resolveServerGeminiKey();

    if (!API_KEY) {
      return res.status(401).json({
        ok: false,
        error: 'No se encontró GEMINI_API_KEY en el servidor.'
      });
    }

    const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');
    const detectedMime =
      imageBase64.match(/^data:([^;]+);base64,/)?.[1] || mimeType || 'image/jpeg';
    const todayISO = new Date().toISOString().split('T')[0];

    const payload = {
      contents: [
        {
          parts: [
            {
              text: `${CHILEAN_TAX_SYSTEM_PROMPT}\nFecha actual del sistema (solo usar si la fecha es totalmente ilegible): ${todayISO}`
            },
            {
              inlineData: {
                mimeType: detectedMime,
                data: cleanBase64
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json'
      }
    };

    // Prioriza los modelos Flash más rápidos y estables para evitar timeouts de 10s en Vercel Serverless
    const modelsToTry = [
      'gemini-3.5-flash',
      'gemini-3.6-flash',
      'gemini-flash-lite-latest',
      'gemini-2.0-flash'
    ];
    let lastError = '';
    let lastStatus = 500;

    for (const modelName of modelsToTry) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 7500);

      try {
        const geminiEndpoint =
          'https://generativelanguage.googleapis.com/v1beta/models/' +
          modelName +
          ':generateContent?key=' +
          API_KEY;

        const geminiResp = await fetch(geminiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': API_KEY
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        clearTimeout(timer);

        if (geminiResp.ok) {
          const geminiJson = await geminiResp.json();
          const rawText = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text;

          if (rawText) {
            const cleanJsonText = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
            const parsed = JSON.parse(cleanJsonText);

            return res.status(200).json({
              ok: true,
              provider: modelName,
              data: normalizeExtractedReceipt(parsed)
            });
          }
        } else {
          lastStatus = geminiResp.status;
          try {
            const errJson = await geminiResp.json();
            lastError = errJson?.error?.message || `HTTP ${geminiResp.status}`;
          } catch {
            lastError = (await geminiResp.text()) || `HTTP ${geminiResp.status}`;
          }
          if (geminiResp.status === 401 || geminiResp.status === 403) {
            break;
          }
        }
      } catch (fetchErr) {
        clearTimeout(timer);
        lastError =
          fetchErr.name === 'AbortError'
            ? 'Tiempo de espera agotado consultando el modelo.'
            : fetchErr.message;
      }
    }

    return res.status(lastStatus).json({
      ok: false,
      error: `No se pudo procesar la boleta con Gemini (${lastStatus}): ${lastError}`
    });
  } catch (error) {
    console.error('[scan-receipt] Error:', error);
    return res.status(500).json({
      ok: false,
      error: `Error al procesar la boleta con Gemini: ${error.message || 'Error desconocido'}`
    });
  }
}
