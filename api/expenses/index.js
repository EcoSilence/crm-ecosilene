/**
 * Vercel Serverless API Route: /api/expenses
 * Soporta GET, POST, PUT, DELETE para sincronización centralizada de Gastos con Supabase.
 * Permite discriminar por entidad: 'empresa' | 'casa'.
 */

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || 'https://aopxqymvcgaklfwqhjjv.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvcHhxeW12Y2dha2xmd3Foamp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NzI3MzQsImV4cCI6MjA5MjU0ODczNH0.BgKxvitxbIn_ZHqu9fZw_1d0IFmSlKuRqOle3n8Ngoc';

const headers = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json'
};

function normalizeRow(item, defaultEntidad = 'empresa') {
  if (!item) return null;
  const entidad = item.entidad || item.tipo_entidad || item.scope || defaultEntidad;
  return {
    id: item.id || `gas-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    created_at: item.created_at || new Date().toISOString(),
    fecha: item.fecha || new Date().toISOString().split('T')[0],
    entidad,
    tipo_entidad: entidad,
    tipo_doc: item.tipo_doc || item.tipoDocumento || 'Boleta Electrónica',
    tipoDocumento: item.tipo_doc || item.tipoDocumento || 'Boleta Electrónica',
    proveedor: item.proveedor || item.razonSocial || 'Proveedor General',
    razonSocial: item.proveedor || item.razonSocial || 'Proveedor General',
    rut: item.rut || item.rutEmisor || '',
    rutEmisor: item.rut || item.rutEmisor || '',
    categoria: item.categoria || (entidad === 'casa' ? 'Otros Hogar' : 'Otros Gastos'),
    descripcion: item.descripcion || '',
    neto: Math.round(Number(item.neto) || 0),
    iva: Math.round(Number(item.iva) || 0),
    total_bruto: Math.round(Number(item.total_bruto ?? item.total) || 0),
    total: Math.round(Number(item.total_bruto ?? item.total) || 0),
    comprobante_url: item.comprobante_url || item.comprobanteImg || '',
    comprobanteImg: item.comprobante_url || item.comprobanteImg || '',
    nombreArchivo: item.nombreArchivo || ''
  };
}

function getConfigKeyForEntity(entidad) {
  return entidad === 'casa' ? 'gastos_casa_registros' : 'gastos_registros';
}

// 1. Intenta consultar tabla 'gastos' directamente con filtro de entidad; si no existe, usa 'configuracion'
async function fetchExpensesFromSupabase(entidad = 'empresa') {
  try {
    const tableResp = await fetch(
      `${SUPABASE_URL}/rest/v1/gastos?entidad=eq.${entidad}&select=*&order=fecha.desc,created_at.desc`,
      { headers }
    );
    if (tableResp.ok) {
      const rows = await tableResp.json();
      return { source: 'table:gastos', entidad, data: rows.map((r) => normalizeRow(r, entidad)) };
    }
  } catch (err) {
    console.warn('[api/expenses] Error consultando tabla gastos:', err.message);
  }

  // Fallback a tabla configuracion según entidad
  const configKey = getConfigKeyForEntity(entidad);
  try {
    const configResp = await fetch(
      `${SUPABASE_URL}/rest/v1/configuracion?clave=eq.${configKey}&select=valor`,
      { headers }
    );
    if (configResp.ok) {
      const rows = await configResp.json();
      const list = Array.isArray(rows?.[0]?.valor) ? rows[0].valor : [];
      return { source: `configuracion:${configKey}`, entidad, data: list.map((r) => normalizeRow(r, entidad)) };
    }
  } catch (err) {
    console.warn(`[api/expenses] Error consultando configuracion (${configKey}):`, err.message);
  }

  return { source: 'empty', entidad, data: [] };
}

// 2. Guarda un gasto en Supabase según su entidad
async function saveExpenseToSupabase(expense) {
  const entidad = expense.entidad || expense.tipo_entidad || 'empresa';
  const normalized = normalizeRow(expense, entidad);

  // Intentar guardar en tabla 'gastos'
  try {
    const tablePayload = {
      id: normalized.id,
      created_at: normalized.created_at,
      fecha: normalized.fecha,
      entidad: normalized.entidad,
      tipo_doc: normalized.tipo_doc,
      proveedor: normalized.proveedor,
      rut: normalized.rut,
      categoria: normalized.categoria,
      descripcion: normalized.descripcion,
      neto: normalized.neto,
      iva: normalized.iva,
      total_bruto: normalized.total_bruto,
      comprobante_url: normalized.comprobante_url
    };

    const tableResp = await fetch(`${SUPABASE_URL}/rest/v1/gastos`, {
      method: 'POST',
      headers: {
        ...headers,
        Prefer: 'resolution=merge-duplicates,return=representation'
      },
      body: JSON.stringify(tablePayload)
    });

    if (tableResp.ok) {
      const inserted = await tableResp.json();
      return { ok: true, source: 'table:gastos', entidad, data: normalizeRow(inserted?.[0] || normalized, entidad) };
    }
  } catch (err) {
    console.warn('[api/expenses] Error insertando en tabla gastos:', err.message);
  }

  // Fallback a configuracion
  const configKey = getConfigKeyForEntity(entidad);
  const current = await fetchExpensesFromSupabase(entidad);
  const existingList = current.data || [];
  const existsIndex = existingList.findIndex((g) => g.id === normalized.id);

  let updatedList;
  if (existsIndex >= 0) {
    updatedList = existingList.map((g, i) => (i === existsIndex ? normalized : g));
  } else {
    updatedList = [normalized, ...existingList];
  }

  const upsertResp = await fetch(`${SUPABASE_URL}/rest/v1/configuracion`, {
    method: 'POST',
    headers: {
      ...headers,
      Prefer: 'resolution=merge-duplicates,return=representation'
    },
    body: JSON.stringify({
      clave: configKey,
      valor: updatedList
    })
  });

  if (upsertResp.ok) {
    return { ok: true, source: `configuracion:${configKey}`, entidad, data: normalized };
  }

  const errText = await upsertResp.text();
  throw new Error(`Error en Supabase (${upsertResp.status}): ${errText}`);
}

// 3. Elimina un gasto según su entidad
async function deleteExpenseFromSupabase(id, entidad = 'empresa') {
  try {
    const tableResp = await fetch(`${SUPABASE_URL}/rest/v1/gastos?id=eq.${id}&entidad=eq.${entidad}`, {
      method: 'DELETE',
      headers
    });
    if (tableResp.ok) {
      return { ok: true, source: 'table:gastos', entidad };
    }
  } catch (err) {
    console.warn('[api/expenses] Error eliminando en tabla gastos:', err.message);
  }

  const configKey = getConfigKeyForEntity(entidad);
  const current = await fetchExpensesFromSupabase(entidad);
  const updatedList = (current.data || []).filter((g) => g.id !== id);

  await fetch(`${SUPABASE_URL}/rest/v1/configuracion`, {
    method: 'POST',
    headers: {
      ...headers,
      Prefer: 'resolution=merge-duplicates,return=representation'
    },
    body: JSON.stringify({
      clave: configKey,
      valor: updatedList
    })
  });

  return { ok: true, source: `configuracion:${configKey}`, entidad };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const entidad = req.query?.entidad || req.body?.entidad || 'empresa';

    if (req.method === 'GET') {
      const result = await fetchExpensesFromSupabase(entidad);
      return res.status(200).json({ ok: true, source: result.source, entidad: result.entidad, data: result.data });
    }

    if (req.method === 'POST') {
      const expenseData = req.body;
      if (!expenseData) {
        return res.status(400).json({ ok: false, error: 'No se envió el cuerpo del gasto.' });
      }
      const result = await saveExpenseToSupabase(expenseData);
      return res.status(200).json(result);
    }

    if (req.method === 'DELETE') {
      const id = req.query?.id || req.body?.id;
      if (!id) {
        return res.status(400).json({ ok: false, error: 'Se requiere el ID para eliminar.' });
      }
      const result = await deleteExpenseFromSupabase(id, entidad);
      return res.status(200).json(result);
    }

    return res.status(405).json({ ok: false, error: 'Método no permitido.' });
  } catch (error) {
    console.error('[api/expenses] Error en controlador:', error);
    return res.status(500).json({ ok: false, error: error.message || 'Error del servidor' });
  }
}
