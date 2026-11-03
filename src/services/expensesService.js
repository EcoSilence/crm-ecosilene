/**
 * Expenses Service (Sincronización Centralizada de Gastos con Supabase y Backend)
 * Conecta el módulo de Gastos con la base de datos centralizada de EcoSilence CRM.
 * Soporta discriminación total entre 'empresa' y 'casa'.
 */
import { supabase } from '../supabaseClient';

export const EXPENSES_STORAGE_KEY_EMPRESA = 'ecosilence_gastos_registros_v1';
export const EXPENSES_STORAGE_KEY_CASA = 'ecosilence_gastos_casa_registros_v1';

export const getStorageKey = (entidad = 'empresa') => {
  return entidad === 'casa' ? EXPENSES_STORAGE_KEY_CASA : EXPENSES_STORAGE_KEY_EMPRESA;
};

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
export const normalizeExpenseRecord = (raw, defaultEntidad = 'empresa') => {
  if (!raw) return null;

  const entidad = raw.entidad || raw.tipo_entidad || raw.scope || defaultEntidad;
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
  const proveedor = raw.proveedor || raw.razonSocial || (entidad === 'casa' ? 'Comercio General' : 'Proveedor General');
  const rut = raw.rut || raw.rutEmisor || '';
  const categoria = raw.categoria || (entidad === 'casa' ? 'Otros Hogar' : 'Otros Gastos');
  const descripcion = raw.descripcion || `${proveedor} — ${categoria}`;
  const comprobanteUrl = raw.comprobante_url || raw.comprobanteImg || '';

  return {
    id,
    created_at: raw.created_at || new Date().toISOString(),
    fecha,
    entidad,
    tipo_entidad: entidad,
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
 * Carga todos los gastos desde la base de datos centralizada de Supabase según la entidad ('empresa' | 'casa').
 */
export const fetchCentralizedExpenses = async (entidad = 'empresa') => {
  const storageKey = getStorageKey(entidad);

  // 1. Intento directo en la tabla 'gastos' de Supabase con filtro de entidad
  try {
    const { data, error } = await supabase
      .from('gastos')
      .select('*')
      .eq('entidad', entidad)
      .order('fecha', { ascending: false });

    if (!error && Array.isArray(data)) {
      const normalized = data.map((d) => normalizeExpenseRecord(d, entidad));
      try {
        localStorage.setItem(storageKey, JSON.stringify(normalized));
      } catch (e) {
        console.warn('Error cacheando en localStorage:', e);
      }
      return normalized;
    }
  } catch (err) {
    console.warn(`[expensesService] Tabla gastos (${entidad}) no disponible en Supabase:`, err.message);
  }

  // 2. Intento vía API Route ('/api/expenses?entidad=' + entidad)
  try {
    let resp = await fetch(`/api/expenses?entidad=${encodeURIComponent(entidad)}`);
    if (!resp.ok) {
      resp = await fetch(`/api/expenses/index?entidad=${encodeURIComponent(entidad)}`);
    }
    if (resp.ok) {
      const json = await resp.json();
      if (json.ok && Array.isArray(json.data)) {
        const normalized = json.data.map((d) => normalizeExpenseRecord(d, entidad));
        try {
          localStorage.setItem(storageKey, JSON.stringify(normalized));
        } catch (e) {
          console.warn('Error cacheando en localStorage:', e);
        }
        return normalized;
      }
    }
  } catch (err) {
    console.warn(`[expensesService] Error en /api/expenses (${entidad}):`, err.message);
  }

  // 3. Intento vía Supabase configuracion (clave = 'gastos_casa_registros' o 'gastos_registros')
  const configKey = entidad === 'casa' ? 'gastos_casa_registros' : 'gastos_registros';
  try {
    const { data: configRow, error: configErr } = await supabase
      .from('configuracion')
      .select('valor')
      .eq('clave', configKey)
      .single();

    if (!configErr && configRow?.valor && Array.isArray(configRow.valor)) {
      const normalized = configRow.valor.map((d) => normalizeExpenseRecord(d, entidad));
      try {
        localStorage.setItem(storageKey, JSON.stringify(normalized));
      } catch (e) {
        console.warn('Error cacheando en localStorage:', e);
      }
      return normalized;
    }
  } catch (err) {
    console.warn(`[expensesService] Error consultando configuracion (${configKey}):`, err.message);
  }

  // 4. Respaldo local de emergencia
  try {
    const local = localStorage.getItem(storageKey);
    return local ? JSON.parse(local).map((d) => normalizeExpenseRecord(d, entidad)) : [];
  } catch {
    return [];
  }
};

/**
 * Guarda o actualiza un gasto en la base de datos centralizada de Supabase según su entidad.
 */
export const saveCentralizedExpense = async (expenseData, entidad = 'empresa') => {
  const targetEntity = expenseData.entidad || entidad || 'empresa';
  const normalized = normalizeExpenseRecord({ ...expenseData, entidad: targetEntity }, targetEntity);
  const storageKey = getStorageKey(targetEntity);

  const dbPayload = {
    id: normalized.id,
    created_at: normalized.created_at,
    fecha: normalized.fecha,
    entidad: targetEntity,
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
    console.warn(`[expensesService] Error upsert en tabla gastos (${targetEntity}):`, err.message);
  }

  // 2. Sincronización vía API Route ('/api/expenses')
  if (!savedOk) {
    try {
      let resp = await fetch(`/api/expenses?entidad=${encodeURIComponent(targetEntity)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalized)
      });
      if (!resp.ok) {
        resp = await fetch(`/api/expenses/index?entidad=${encodeURIComponent(targetEntity)}`, {
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
      console.warn(`[expensesService] Error en POST /api/expenses (${targetEntity}):`, err.message);
    }
  }

  // 3. Fallback directo a configuracion en Supabase
  if (!savedOk) {
    const configKey = targetEntity === 'casa' ? 'gastos_casa_registros' : 'gastos_registros';
    try {
      const currentList = await fetchCentralizedExpenses(targetEntity);
      const existingIdx = currentList.findIndex((g) => g.id === normalized.id);
      let updatedList;
      if (existingIdx >= 0) {
        updatedList = currentList.map((g, i) => (i === existingIdx ? normalized : g));
      } else {
        updatedList = [normalized, ...currentList];
      }
      await supabase
        .from('configuracion')
        .upsert({ clave: configKey, valor: updatedList });
      savedOk = true;
    } catch (err) {
      console.error(`[expensesService] Error guardando en fallback Supabase (${configKey}):`, err);
    }
  }

  // Notificar a otras pestañas/componentes localmente
  try {
    window.dispatchEvent(
      new CustomEvent('ecosilence:expenses_updated', {
        detail: { ...normalized, entidad: targetEntity }
      })
    );
  } catch (e) {
    // Ignore
  }

  return normalized;
};

/**
 * Elimina un gasto de la base de datos centralizada de Supabase según su entidad.
 */
export const deleteCentralizedExpense = async (id, entidad = 'empresa') => {
  let deletedOk = false;

  // 1. Intento en tabla 'gastos'
  try {
    const { error } = await supabase
      .from('gastos')
      .delete()
      .eq('id', id)
      .eq('entidad', entidad);
    if (!error) deletedOk = true;
  } catch (err) {
    console.warn(`[expensesService] Error delete en tabla gastos (${entidad}):`, err.message);
  }

  // 2. Vía API Route
  try {
    let resp = await fetch(`/api/expenses?id=${encodeURIComponent(id)}&entidad=${encodeURIComponent(entidad)}`, {
      method: 'DELETE'
    });
    if (!resp.ok) {
      resp = await fetch(`/api/expenses/index?id=${encodeURIComponent(id)}&entidad=${encodeURIComponent(entidad)}`, {
        method: 'DELETE'
      });
    }
    if (resp.ok) deletedOk = true;
  } catch (err) {
    console.warn(`[expensesService] Error delete en /api/expenses (${entidad}):`, err.message);
  }

  // 3. Fallback directo a configuracion
  if (!deletedOk) {
    const configKey = entidad === 'casa' ? 'gastos_casa_registros' : 'gastos_registros';
    try {
      const currentList = await fetchCentralizedExpenses(entidad);
      const updatedList = currentList.filter((g) => g.id !== id);
      await supabase
        .from('configuracion')
        .upsert({ clave: configKey, valor: updatedList });
    } catch (err) {
      console.error(`[expensesService] Error delete en fallback Supabase (${configKey}):`, err);
    }
  }

  try {
    window.dispatchEvent(
      new CustomEvent('ecosilence:expenses_updated', {
        detail: { id, entidad, deleted: true }
      })
    );
  } catch (e) {
    // Ignore
  }

  return true;
};

/**
 * Suscripción en Tiempo Real con Supabase Realtime para sincronizar
 * instantáneamente entre el celular y el computador.
 */
export const subscribeToExpensesRealtime = (onChangeCallback, entidad = 'empresa') => {
  const channelName = `expenses_realtime_${entidad}_feed`;
  const configKey = entidad === 'casa' ? 'gastos_casa_registros' : 'gastos_registros';
  const storageKey = getStorageKey(entidad);

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'gastos', filter: `entidad=eq.${entidad}` },
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
        filter: `clave=eq.${configKey}`
      },
      () => {
        onChangeCallback();
      }
    )
    .subscribe();

  const handleCustomEvent = (e) => {
    if (!e.detail?.entidad || e.detail.entidad === entidad) {
      onChangeCallback();
    }
  };

  const handleStorageEvent = (e) => {
    if (e.key === storageKey) {
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
