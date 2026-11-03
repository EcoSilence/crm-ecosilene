/**
 * Vercel Serverless API Route: /api/expenses
 * Soporta GET, POST, PUT, DELETE para sincronización centralizada de Gastos con Supabase.
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

function normalizeRow(item) {
  if (!item) return null;
  return {
    id: item.id || `gas-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    created_at: item.created_at || new Date().toISOString(),
    fecha: item.fecha || new Date().toISOString().split('T')[0],
    tipo_doc: item.tipo_doc || item.tipoDocumento || 'Boleta Electrónica',
    tipoDocumento: item.tipo_doc || item.tipoDocumento || 'Boleta Electrónica',
    proveedor: item.proveedor || item.razonSocial || 'Proveedor General',
    razonSocial: item.proveedor || item.razonSocial || 'Proveedor General',
    rut: item.rut || item.rutEmisor || '',
    rutEmisor: item.rut || item.rutEmisor || '',
    categoria: item.categoria || 'Otros Gastos',
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

// 1. Intenta consultar tabla 'gastos' directamente; si no existe, usa 'configuracion'
async function fetchExpensesFromSupabase() {
  try {
    const tableResp = await fetch(
      `${SUPABASE_URL}/rest/v1/gastos?select=*&order=fecha.desc,created_at.desc`,
      { headers }
    );
    if (tableResp.ok) {
      const rows = await tableResp.json();
      return { source: 'table:gastos', data: rows.map(normalizeRow) };
    }
  } catch (err) {
    console.warn('[api/expenses] Error consultando tabla gastos:', err.message);
  }

  // Fallback a tabla configuracion (clave = 'gastos_registros')
  try {
    const configResp = await fetch(
      `${SUPABASE_URL}/rest/v1/configuracion?clave=eq.gastos_registros&select=valor`,
      { headers }
    );
    if (configResp.ok) {
      const rows = await configResp.json();
      const list = Array.isArray(rows?.[0]?.valor) ? rows[0].valor : [];
      return { source: 'configuracion:gastos_registros', data: list.map(normalizeRow) };
    }
  } catch (err) {
    console.warn('[api/expenses] Error consultando configuracion:', err.message);
  }

  return { source: 'empty', data: [] };
}

// 2. Guarda un gasto en Supabase (en tabla 'gastos' o en 'configuracion')
async function saveExpenseToSupabase(expense) {
  const normalized = normalizeRow(expense);

  // Intentar guardar en tabla 'gastos'
  try {
    const tablePayload = {
      id: normalized.id,
      created_at: normalized.created_at,
      fecha: normalized.fecha,
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
      return { ok: true, source: 'table:gastos', data: normalizeRow(inserted?.[0] || normalized) };
    }
  } catch (err) {
    console.warn('[api/expenses] Error insertando en tabla gastos:', err.message);
  }

  // Fallback a configuracion (clave = 'gastos_registros')
  const current = await fetchExpensesFromSupabase();
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
      clave: 'gastos_registros',
      valor: updatedList
    })
  });

  if (upsertResp.ok) {
    return { ok: true, source: 'configuracion:gastos_registros', data: normalized };
  }

  const errText = await upsertResp.text();
  throw new Error(`Error en Supabase (${upsertResp.status}): ${errText}`);
}

// 3. Elimina un gasto
async function deleteExpenseFromSupabase(id) {
  try {
    const tableResp = await fetch(`${SUPABASE_URL}/rest/v1/gastos?id=eq.${id}`, {
      method: 'DELETE',
      headers
    });
    if (tableResp.ok) {
      return { ok: true, source: 'table:gastos' };
    }
  } catch (err) {
    console.warn('[api/expenses] Error eliminando en tabla gastos:', err.message);
  }

  const current = await fetchExpensesFromSupabase();
  const updatedList = (current.data || []).filter((g) => g.id !== id);

  await fetch(`${SUPABASE_URL}/rest/v1/configuracion`, {
    method: 'POST',
    headers: {
      ...headers,
      Prefer: 'resolution=merge-duplicates,return=representation'
    },
    body: JSON.stringify({
      clave: 'gastos_registros',
      valor: updatedList
    })
  });

  return { ok: true, source: 'configuracion:gastos_registros' };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const result = await fetchExpensesFromSupabase();
      return res.status(200).json({ ok: true, source: result.source, data: result.data });
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
      const result = await deleteExpenseFromSupabase(id);
      return res.status(200).json(result);
    }

    return res.status(405).json({ ok: false, error: 'Método no permitido.' });
  } catch (error) {
    console.error('[api/expenses] Error en controlador:', error);
    return res.status(500).json({ ok: false, error: error.message || 'Error del servidor' });
  }
}

