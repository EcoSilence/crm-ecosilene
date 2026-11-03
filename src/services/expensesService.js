/**
 * Expenses Service (Sincronización Centralizada de Gastos con Supabase y Backend)
 * Conecta el módulo de Gastos con la base de datos centralizada de EcoSilence CRM.
 */
import { supabase } from '../supabaseClient';

export const EXPENSES_STORAGE_KEY = 'ecosilence_gastos_registros_v1';

/**
 * Genera un UUID estándar v4 compatible con columnas UUID de PostgreSQL
 */
export const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Normaliza un registro para ser consumido tanto por la UI (camelCase)
 * como por la tabla PostgreSQL (snake_case).
 */
export const normalizeExpenseRecord = (raw) => {
  if (!raw) return null;

  const totalNum = Math.round(Number(raw.total_bruto ?? raw.total) || 0);
  const netoNum =
    raw.neto !== undefined && raw.neto !== '' && Number(raw.neto) > 0
      ? Math.round(Number(raw.neto))
      : Math.round(totalNum / 1.19);
  const ivaNum =
    raw.iva !== undefined && raw.iva !== '' && Number(raw.iva) > 0
      ? Math.round(Number(raw.iva))
      : totalNum - netoNum;

  const id =
    raw.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw.id)
      ? raw.id
      : generateUUID();

  const fecha = raw.fecha || new Date().toISOString().split('T')[0];
  const tipoDoc = raw.tipo_doc || raw.tipoDocumento || 'Boleta Electrónica';
  const proveedor = raw.proveedor || raw.razonSocial || 'Proveedor General';
  const rut = raw.rut || raw.rutEmisor || '';
  const categoria = raw.categoria || 'Otros Gastos';
  const descripcion = raw.descripcion || `${proveedor} — ${categoria}`;
  const comprobanteUrl = raw.comprobante_url || raw.comprobanteImg || '';

  return {
    id,
    created_at: raw.created_at || new Date().toISOString(),
    fecha,
    tipo_doc: tipoDoc,
    tipoDocumento: tipoDoc,
    proveedor,
    razonSocial: proveedor,
    rut,
    rutEmisor: rut,
    categoria,
    descripcion,
    neto: netoNum,
    iva: ivaNum,
    total_bruto: totalNum,
    total: totalNum,
    comprobante_url: comprobanteUrl,
    comprobanteImg: comprobanteUrl,
    nombreArchivo: raw.nombreArchivo || ''
  };
};

/**
 * Carga todos los gastos desde la base de datos centralizada de Supabase.
 * Ordenados por fecha descendente.
 */
export const fetchCentralizedExpenses = async () => {
  // 1. Intento directo en la tabla 'gastos' de Supabase
  try {
    const { data, error } = await supabase
      .from('gastos')
      .select('*')
      .order('fecha', { ascending: false });

    if (!error && Array.isArray(data)) {
      const normalized = data.map(normalizeExpenseRecord);
      try {
        localStorage.setItem(EXPENSES_STORAGE_KEY, JSON.stringify(normalized));
      } catch (e) {
        console.warn('Error cacheando en localStorage:', e);
      }
      return normalized;
    }
  } catch (err) {
    console.warn('[expensesService] Tabla gastos no disponible en Supabase:', err.message);
  }

  // 2. Intento vía API Route ('/api/expenses' o '/api/expenses/index')
  try {
    let resp = await fetch('/api/expenses');
    if (!resp.ok) {
      resp = await fetch('/api/expenses/index');
    }
    if (resp.ok) {
      const json = await resp.json();
      if (json.ok && Array.isArray(json.data)) {
        const normalized = json.data.map(normalizeExpenseRecord);
        try {
          localStorage.setItem(EXPENSES_STORAGE_KEY, JSON.stringify(normalized));
        } catch (e) {
          console.warn('Error cacheando en localStorage:', e);
        }
        return normalized;
      }
    }
  } catch (err) {
    console.warn('[expensesService] Error en /api/expenses:', err.message);
  }

  // 3. Intento vía Supabase configuracion (clave = 'gastos_registros')
  try {
    const { data: configRow, error: configErr } = await supabase
      .from('configuracion')
      .select('valor')
      .eq('clave', 'gastos_registros')
      .single();

    if (!configErr && configRow?.valor && Array.isArray(configRow.valor)) {
      const normalized = configRow.valor.map(normalizeExpenseRecord);
      try {
        localStorage.setItem(EXPENSES_STORAGE_KEY, JSON.stringify(normalized));
      } catch (e) {
        console.warn('Error cacheando en localStorage:', e);
      }
      return normalized;
    }
  } catch (err) {
    console.warn('[expensesService] Error consultando configuracion en Supabase:', err.message);
  }

  // 4. Respaldo local de emergencia
  try {
    const local = localStorage.getItem(EXPENSES_STORAGE_KEY);
    return local ? JSON.parse(local).map(normalizeExpenseRecord) : [];
  } catch {
    return [];
  }
};

/**
 * Guarda o actualiza un gasto en la base de datos centralizada de Supabase.
 */
export const saveCentralizedExpense = async (expenseData) => {
  const normalized = normalizeExpenseRecord(expenseData);

  // Prepara el payload para PostgreSQL
  const dbPayload = {
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

  let savedOk = false;

  // 1. Intento directo en tabla 'gastos'
  try {
    const { error } = await supabase.from('gastos').upsert(dbPayload);
    if (!error) {
      savedOk = true;
    }
  } catch (err) {
    console.warn('[expensesService] Error upsert en tabla gastos:', err.message);
  }

  // 2. Sincronización vía API Route ('/api/expenses' o '/api/expenses/index')
  if (!savedOk) {
    try {
      let resp = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalized)
      });
      if (!resp.ok) {
        resp = await fetch('/api/expenses/index', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(normalized)
        });
      }
      if (resp.ok) {
        const json = await resp.json();
        if (json.ok) {
          savedOk = true;
        }
      }
    } catch (err) {
      console.warn('[expensesService] Error en POST /api/expenses:', err.message);
    }
  }

  // 3. Fallback directo a configuracion en Supabase si API route no respondió
  if (!savedOk) {
    try {
      const currentList = await fetchCentralizedExpenses();
      const existingIdx = currentList.findIndex((g) => g.id === normalized.id);
      let updatedList;
      if (existingIdx >= 0) {
        updatedList = currentList.map((g, i) => (i === existingIdx ? normalized : g));
      } else {
        updatedList = [normalized, ...currentList];
      }
      await supabase
        .from('configuracion')
        .upsert({ clave: 'gastos_registros', valor: updatedList });
      savedOk = true;
    } catch (err) {
      console.error('[expensesService] Error guardando en fallback de Supabase:', err);
    }
  }

  // Notificar a otras pestañas/componentes localmente
  try {
    window.dispatchEvent(new CustomEvent('ecosilence:expenses_updated', { detail: normalized }));
  } catch (e) {
    // Ignore in non-browser env
  }

  return normalized;
};

/**
 * Elimina un gasto de la base de datos centralizada de Supabase.
 */
export const deleteCentralizedExpense = async (id) => {
  let deletedOk = false;

  // 1. Intento en tabla 'gastos'
  try {
    const { error } = await supabase.from('gastos').delete().eq('id', id);
    if (!error) deletedOk = true;
  } catch (err) {
    console.warn('[expensesService] Error delete en tabla gastos:', err.message);
  }

  // 2. Vía API Route ('/api/expenses' o '/api/expenses/index')
  try {
    let resp = await fetch(`/api/expenses?id=${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    if (!resp.ok) {
      resp = await fetch(`/api/expenses/index?id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
    }
    if (resp.ok) deletedOk = true;
  } catch (err) {
    console.warn('[expensesService] Error delete en /api/expenses:', err.message);
  }

  // 3. Fallback directo a configuracion
  if (!deletedOk) {
    try {
      const currentList = await fetchCentralizedExpenses();
      const updatedList = currentList.filter((g) => g.id !== id);
      await supabase
        .from('configuracion')
        .upsert({ clave: 'gastos_registros', valor: updatedList });
    } catch (err) {
      console.error('[expensesService] Error delete en fallback Supabase:', err);
    }
  }

  try {
    window.dispatchEvent(new CustomEvent('ecosilence:expenses_updated', { detail: { id, deleted: true } }));
  } catch (e) {
    // Ignore
  }

  return true;
};

/**
 * Suscripción en Tiempo Real con Supabase Realtime para sincronizar
 * instantáneamente entre el celular y el computador.
 */
export const subscribeToExpensesRealtime = (onChangeCallback) => {
  const channel = supabase
    .channel('expenses_realtime_feed')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'gastos' },
      () => {
        onChangeCallback();
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'configuracion',
        filter: 'clave=eq.gastos_registros'
      },
      () => {
        onChangeCallback();
      }
    )
    .subscribe();

  const handleCustomEvent = () => {
    onChangeCallback();
  };

  const handleStorageEvent = (e) => {
    if (e.key === EXPENSES_STORAGE_KEY) {
      onChangeCallback();
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('ecosilence:expenses_updated', handleCustomEvent);
    window.addEventListener('storage', handleStorageEvent);
  }

  return () => {
    supabase.removeChannel(channel);
    if (typeof window !== 'undefined') {
      window.removeEventListener('ecosilence:expenses_updated', handleCustomEvent);
      window.removeEventListener('storage', handleStorageEvent);
    }
  };
};
