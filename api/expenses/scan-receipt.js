/**
 * Vercel Serverless API Route: POST /api/expenses/scan-receipt
 * Escaneo inteligente de boletas, facturas y comprobantes chilenos (SII / Transbank)
 * usando IA Multimodal (Gemini Flash o OpenAI GPT-4o-mini con JSON estructurado).
 */

export const CHILEAN_TAX_SYSTEM_PROMPT = `Eres un contador auditor experto en tributación chilena (SII - Servicio de Impuestos Internos).
Tu tarea es analizar la imagen de un documento tributario o comprobante de pago chileno y extraer sus datos estructurados en formato JSON estricto.

REGLAS DE EXTRACCIÓN TRIBUTARIA (CHILE):
1. "tipoDocumento": Clasifica obligatoriamente en uno de estos 4 valores exactos:
   - "Boleta Electrónica"
   - "Factura Electrónica"
   - "Voucher Transbank"
   - "Comprobante de Transferencia"

2. "fecha": Fecha de emisión del documento en formato "AAAA-MM-DD". Si solo aparece DD/MM/AAAA o DD-MM-AAAA, conviértelo a "AAAA-MM-DD".

3. "rutEmisor": RUT del comercio o emisor en formato chileno (ej. "76.123.456-7"). Si no es legible, devuelve "".

4. "razonSocial": Nombre comercial o Razón Social del proveedor/comercio (ej. "COPEC S.A.", "SODIMAC HOME CENTER", "STARBUCKS COFFEE CHILE").

5. "resumenItems": Breve descripción de los productos o servicios adquiridos (ej. "Carga combustible 95 octanos", "Cables XLR y conectores de audio", "Almuerzo equipo técnico").

6. "montos": Extrae los valores en Pesos Chilenos (CLP, enteros sin decimales):
   - "total": Monto Total Bruto ($ CLP).
   - "neto": Si es Factura Electrónica o indica monto neto explícito, extráelo; de lo contrario calcula Math.round(total / 1.19). Si el documento es exento o una transferencia sin IVA, neto = total.
   - "iva": Si es afecta a IVA (19%), calcula total - neto (equivalente al 19% sobre el neto). Si es exenta o "Comprobante de Transferencia", devuelve 0.
   - "exento": true si el documento es exento de IVA o transferencia bancaria, false en caso contrario.

7. "categoria": Auto-clasifica la categoría contable según el comercio y giro:
   - Si es Copec, Shell, Petrobras, Aramco, estacionamiento, TAG o peaje -> "Transporte / Bencina"
   - Si es restaurante, cafetería, supermercado (Lider, Jumbo, Unimarc, Pronto, etc.) -> "Alimentación / Viáticos"
   - Si es audio, electrónica, ferretería (Sodimac, Easy, Casa Royal, Audiomusica, PC Factory), cables, pilas o tecnología -> "Insumos Técnicos / Mantenimiento"
   - Si no encaja en las anteriores -> "Otros Gastos"

Responde ÚNICAMENTE con un objeto JSON válido con la siguiente estructura exacta:
{
  "tipoDocumento": "Factura Electrónica",
  "fecha": "2026-11-02",
  "rutEmisor": "76.543.210-K",
  "razonSocial": "Nombre del Comercio",
  "resumenItems": "Resumen corto de ítems",
  "descripcion": "Nombre del Comercio - Resumen corto de ítems",
  "categoria": "Insumos Técnicos / Mantenimiento",
  "total": 119000,
  "neto": 100000,
  "iva": 19000,
  "exento": false,
  "confianza": 0.96
}`;

/**
 * Normaliza y valida los montos e información devuelta por el modelo de visión
 */
function normalizeExtractedReceipt(raw = {}) {
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

  const tipoDocumento = validDocTypes.includes(raw.tipoDocumento)
    ? raw.tipoDocumento
    : 'Boleta Electrónica';

  const total = Math.max(0, Math.round(Number(raw.total) || 0));
  const isTransferOrExempt =
    Boolean(raw.exento) || tipoDocumento === 'Comprobante de Transferencia';

  let neto = Math.round(Number(raw.neto) || 0);
  let iva = Math.round(Number(raw.iva) || 0);

  if (total > 0) {
    if (isTransferOrExempt) {
      neto = total;
      iva = 0;
    } else {
      if (!neto || neto <= 0 || neto >= total) {
        neto = Math.round(total / 1.19);
      }
      iva = total - neto;
    }
  }

  const razonSocial = String(raw.razonSocial || 'Comercio').trim();
  const resumenItems = String(raw.resumenItems || 'Compra general').trim();
  const descripcion =
    raw.descripcion && String(raw.descripcion).trim().length > 0
      ? String(raw.descripcion).trim()
      : `${razonSocial} — ${resumenItems}`;

  let categoria = raw.categoria;
  if (!validCategories.includes(categoria)) {
    const lowerText = `${razonSocial} ${resumenItems}`.toLowerCase();
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

  const today = new Date().toISOString().split('T')[0];
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(String(raw.fecha || ''))
    ? String(raw.fecha)
    : today;

  return {
    tipoDocumento,
    fecha,
    rutEmisor: String(raw.rutEmisor || '').trim(),
    razonSocial,
    resumenItems,
    descripcion,
    categoria,
    total,
    neto,
    iva,
    exento: isTransferOrExempt,
    confianza: Number(raw.confianza) || 0.95
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

    // 1. Proveedor Primario: Google Gemini Flash (Multimodal JSON)
    if (geminiKey) {
      const cleanBase64 = imageBase64
        ? imageBase64.replace(/^data:[^;]+;base64,/, '')
        : null;

      const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;

      const parts = [{ text: CHILEAN_TAX_SYSTEM_PROMPT }];
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
            { role: 'system', content: CHILEAN_TAX_SYSTEM_PROMPT },
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Extrae todos los campos tributarios de esta boleta/factura en JSON.' },
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

