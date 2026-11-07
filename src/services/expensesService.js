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
 * Lee exclusivamente desde la base de datos real (sin generar ni recargar datos dummy).
 */
export const fetchCentralizedExpenses = async (entidad = 'empresa') => {
  const storageKey = getStorageKey(entidad);
  const configKey = entidad === 'casa' ? 'gastos_casa_registros' : 'gastos_registros';

  // 1. Intento principal en Supabase configuracion (almacenamiento activo)
  try {
    const { data: configRow, error: configErr } = await supabase
      .from('configuracion')
      .select('valor')
      .eq('clave', configKey)
      .single();

    if (!configErr && configRow && Array.isArray(configRow.valor)) {
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

  // 2. Intento directo en la tabla 'gastos' de Supabase con filtro de entidad
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
    // Ignore si no existe la tabla
  }

  // 3. Intento vía API Route ('/api/expenses?entidad=' + entidad)
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

  // 4. Respaldo local de emergencia (solo si la red falló completamente)
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
  const configKey = targetEntity === 'casa' ? 'gastos_casa_registros' : 'gastos_registros';

  // 1. Guardar de inmediato en localStorage para respuesta instantánea
  try {
    const local = localStorage.getItem(storageKey);
    const list = local ? JSON.parse(local) : [];
    const idx = list.findIndex((g) => String(g.id) === String(normalized.id));
    let updatedLocal;
    if (idx >= 0) {
      updatedLocal = list.map((g, i) => (i === idx ? normalized : g));
    } else {
      updatedLocal = [normalized, ...list];
    }
    localStorage.setItem(storageKey, JSON.stringify(updatedLocal));
  } catch (e) {}

  // 2. Guardar directamente en Supabase configuracion (almacenamiento principal activo)
  try {
    const { data: configRow } = await supabase
      .from('configuracion')
      .select('valor')
      .eq('clave', configKey)
      .single();

    const currentList = Array.isArray(configRow?.valor) ? configRow.valor : [];
    const idx = currentList.findIndex((g) => String(g.id) === String(normalized.id));
    let updatedList;
    if (idx >= 0) {
      updatedList = currentList.map((g, i) => (i === idx ? normalized : g));
    } else {
      updatedList = [normalized, ...currentList];
    }
    await supabase.from('configuracion').upsert({ clave: configKey, valor: updatedList });
  } catch (err) {
    console.warn(`[expensesService] Error guardando en configuracion (${configKey}):`, err.message);
  }

  // 3. Intento en tabla 'gastos' por si existiese
  try {
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
    await supabase.from('gastos').upsert(dbPayload);
  } catch (err) {}

  // 4. Sincronización vía API Route (/api/expenses)
  try {
    await fetch(`/api/expenses?entidad=${encodeURIComponent(targetEntity)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(normalized)
    });
  } catch (err) {}

  // 5. Notificar a otras pestañas/componentes localmente
  try {
    window.dispatchEvent(
      new CustomEvent('ecosilence:expenses_updated', {
        detail: { ...normalized, entidad: targetEntity }
      })
    );
  } catch (e) {}

  return normalized;
};

/**
 * Elimina permanentemente un gasto de la base de datos centralizada de Supabase según su entidad.
 * Garantiza que el registro desaparezca permanentemente tanto de Supabase como del almacenamiento local.
 */
export const deleteCentralizedExpense = async (id, entidad = 'empresa') => {
  const strId = String(id);
  const storageKey = getStorageKey(entidad);
  const configKey = entidad === 'casa' ? 'gastos_casa_registros' : 'gastos_registros';

  // 1. Inmediatamente actualizar cache local (localStorage) para que nunca reaparezca al refrescar
  try {
    const local = localStorage.getItem(storageKey);
    if (local) {
      const list = JSON.parse(local);
      const filtered = list.filter((g) => String(g.id) !== strId);
      localStorage.setItem(storageKey, JSON.stringify(filtered));
    }
  } catch (e) {
    console.warn('[expensesService] Error actualizando cache local tras eliminar:', e);
  }

  // 2. Eliminar permanentemente de Supabase configuracion (almacenamiento central activo)
  try {
    const { data: configRow } = await supabase
      .from('configuracion')
      .select('valor')
      .eq('clave', configKey)
      .single();

    if (configRow?.valor && Array.isArray(configRow.valor)) {
      const updated = configRow.valor.filter((g) => String(g.id) !== strId);
      await supabase
        .from('configuracion')
        .upsert({ clave: configKey, valor: updated });

      // Sincronizar localStorage confirmado
      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify(updated.map((d) => normalizeExpenseRecord(d, entidad)))
        );
      } catch (e) {}
    }
  } catch (err) {
    console.warn(`[expensesService] Error eliminando en configuracion (${configKey}):`, err.message);
  }

  // 3. Intento en tabla 'gastos' por si existiese
  try {
    await supabase
      .from('gastos')
      .delete()
      .eq('id', strId)
      .eq('entidad', entidad);
  } catch (err) {}

  // 4. Sincronización vía API Route (/api/expenses)
  try {
    await fetch(`/api/expenses?id=${encodeURIComponent(strId)}&entidad=${encodeURIComponent(entidad)}`, {
      method: 'DELETE'
    });
  } catch (err) {}

  // 5. Emitir evento para reactividad inmediata
  try {
    window.dispatchEvent(
      new CustomEvent('ecosilence:expenses_updated', {
        detail: { id: strId, entidad, deleted: true }
      })
    );
  } catch (e) {}

  return true;
};

/**
 * Detección Inteligente de Gastos Duplicados (Boleta Electrónica vs. Voucher POS Transbank)
 * Comprueba si ya existe un gasto que coincida en:
 * a) Mismo Monto Total exacto (total_bruto)
 * b) Misma Fecha (YYYY-MM-DD)
 * c) Mismo RUT o Proveedor similar, o voucher Transbank/POS
 */
export const findDuplicateExpense = (newExpense, existingExpenses = [], currentEditingId = null) => {
  if (!newExpense || !Array.isArray(existingExpenses)) return null;

  const newTotal = Math.round(Number(newExpense.total ?? newExpense.total_bruto ?? newExpense.montoTotal) || 0);
  if (newTotal <= 0) return null;

  const newFecha = String(newExpense.fecha || '').trim().slice(0, 10);
  if (!newFecha) return null;

  const cleanRut = (r) => String(r || '').replace(/[^0-9kK]/g, '').toUpperCase();
  const newRut = cleanRut(newExpense.rutEmisor || newExpense.rut);

  const normalizeStr = (s) =>
    String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, ' ')
      .trim();

  const newProv = normalizeStr(newExpense.razonSocial || newExpense.proveedor);
  const newDoc = normalizeStr(newExpense.tipoDocumento || newExpense.tipo_doc);

  for (const existing of existingExpenses) {
    if (currentEditingId && String(existing.id) === String(currentEditingId)) {
      continue;
    }

    const exTotal = Math.round(Number(existing.total ?? existing.total_bruto) || 0);
    const exFecha = String(existing.fecha || '').trim().slice(0, 10);

    // a) Mismo Monto Total exacto
    if (newTotal !== exTotal) continue;

    // b) Misma Fecha exacta (YYYY-MM-DD)
    if (newFecha !== exFecha) continue;

    // c) Mismo RUT, Proveedor similar o detección de voucher POS Transbank
    const exRut = cleanRut(existing.rutEmisor || existing.rut);
    const rutMatches = Boolean(newRut && exRut && newRut === exRut);

    const exProv = normalizeStr(existing.razonSocial || existing.proveedor);
    const exDoc = normalizeStr(existing.tipoDocumento || existing.tipo_doc);

    const provMatches = Boolean(
      newProv && exProv && (
        newProv === exProv ||
        newProv.includes(exProv) ||
        exProv.includes(newProv)
      )
    );

    const isVoucherRelated =
      /transbank|redelcom|pos|voucher/i.test(newProv) ||
      /transbank|redelcom|pos|voucher/i.test(exProv) ||
      /voucher/i.test(newDoc) ||
      /voucher/i.test(exDoc);

    // Si coincide el total y fecha, y además coincide el RUT, o el proveedor,
    // o uno de los dos es voucher Transbank, o ninguno tiene RUT (mismo ticket anónimo)
    if (rutMatches || provMatches || isVoucherRelated || (!newRut && !exRut)) {
      return existing;
    }
  }

  return null;
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
