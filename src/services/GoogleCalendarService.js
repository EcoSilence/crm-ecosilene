/**
 * Servicio para integrar Google Calendar con el CRM de EcoSilence
 */

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const DISCOVERY_DOCS = [
  'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest',
  'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
  'https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest'
];
const SCOPES = 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/gmail.send';

let gapiInited = false;
let gsisInited = false;
let tokenClient;

export const isGapiInitialized = () => gapiInited;
export const isGsisInitialized = () => gsisInited;

// Mapeo de Etapas a Colores de Google Calendar
// 1: Lavanda (Berry), 5: Plátano (Cotizado), 11: Tomate (Por Cobrar), 10: Albahaca (Pagado)
const STAGE_COLORS = {
  'Cotizado': '5',
  'Aprobado': '1',
  'Por Cobrar': '11',
  'Pagado': '10'
};

export const initGoogleScripts = () => {
  return new Promise((resolve) => {
    let attempts = 0;
    const maxAttempts = 50; // 5 segundos máximo

    const checkReady = () => {
      if (window.gapi && window.google && window.google.accounts && window.google.accounts.oauth2) {
        // Inicializar GIS inmediatamente ya que es sincrónico y no depende del cliente GAPI
        try {
          gisLoaded();
        } catch (e) {
          console.error('Error al inicializar cliente GIS:', e);
        }

        // Cargar el cliente de GAPI de forma asíncrona
        window.gapi.load('client', async () => {
          try {
            await initializeGapiClient();
            resolve(true);
          } catch (err) {
            console.error('Error al inicializar cliente GAPI:', err);
            resolve(false);
          }
        });
      } else {
        attempts++;
        if (attempts >= maxAttempts) {
          console.warn('Google scripts failed to load within timeout limit (possibly blocked by AdBlock or lack of internet).');
          resolve(false);
        } else {
          setTimeout(checkReady, 100);
        }
      }
    };
    checkReady();
  });
};

async function initializeGapiClient() {
  await window.gapi.client.init({
    apiKey: API_KEY,
  });

  // Cargar las APIs individualmente para que la falta de habilitación de una no rompa a las demás
  try {
    await window.gapi.client.load('calendar', 'v3');
    console.log('Google Calendar API cargada con éxito.');
  } catch (e) {
    console.error('Error al cargar Google Calendar API:', e);
    throw new Error('No se pudo cargar la API de Google Calendar. Asegúrate de tener habilitada la Calendar API en la consola de Google.');
  }

  try {
    await window.gapi.client.load('gmail', 'v1');
    console.log('Google Gmail API cargada con éxito.');
  } catch (e) {
    console.warn('Google Gmail API opcional no habilitada o falló al cargar:', e);
  }

  try {
    await window.gapi.client.load('drive', 'v3');
    console.log('Google Drive API cargada con éxito.');
  } catch (e) {
    console.warn('Google Drive API opcional no habilitada o falló al cargar:', e);
  }

  gapiInited = true;
}

function gisLoaded() {
  if (tokenClient) return; // Evitar inicializaciones duplicadas
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: '', // definido en el momento del uso
  });
  gsisInited = true;
}

export const restoreGoogleToken = () => {
  try {
    const saved = localStorage.getItem('google_access_token');
    if (!saved) return false;
    const tokenData = JSON.parse(saved);
    if (tokenData.expires_at && Date.now() < tokenData.expires_at) {
      if (window.gapi && window.gapi.client) {
        window.gapi.client.setToken(tokenData);
        return true;
      }
    } else {
      localStorage.removeItem('google_access_token');
    }
  } catch (e) {
    console.warn('Error restoring Google token:', e);
  }
  return false;
};

export const authenticateGoogle = (silent = false) => {
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      reject(new Error('Token client not initialized yet.'));
      return;
    }

    tokenClient.callback = async (resp) => {
      if (resp.error !== undefined) {
        reject(resp);
        return;
      }
      if (window.gapi && window.gapi.client) {
        window.gapi.client.setToken(resp);
        try {
          const tokenData = {
            ...resp,
            expires_at: Date.now() + ((resp.expires_in || 3600) - 60) * 1000
          };
          localStorage.setItem('google_access_token', JSON.stringify(tokenData));
          localStorage.setItem('google_calendar_linked', 'true');
        } catch (e) {
          console.warn('Could not save token to localStorage:', e);
        }
      }
      resolve(resp);
    };

    if (silent) {
      tokenClient.requestAccessToken({ prompt: '' });
    } else {
      tokenClient.requestAccessToken({ prompt: 'consent' });
    }
  });
};

/**
 * Normaliza cualquier formato de fecha (YYYY-MM-DD, DD/MM/YYYY, ISO, Date) a 'YYYY-MM-DD'
 */
export const normalizeDateStringToYMD = (val) => {
  if (!val) return null;
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const str = String(val).trim();
  // Formato YYYY-MM-DD
  const ymdMatch = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (ymdMatch) {
    const [, y, m, d] = ymdMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Formato DD/MM/YYYY
  const dmyMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Fallback con new Date()
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return null;
};

/**
 * Normaliza una hora a 'HH:mm:00'
 */
export const normalizeTimeString = (val) => {
  if (!val) return null;
  const str = String(val).trim();
  const match = str.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (match) {
    const hh = match[1].padStart(2, '0');
    const mm = match[2];
    const ss = match[3] || '00';
    return `${hh}:${mm}:${ss}`;
  }
  return null;
};

/**
 * Retorna dinámicamente el offset RFC 3339 para la zona 'America/Santiago' (-03:00 en verano, -04:00 en invierno).
 */
export const getSantiagoOffset = (dateObj) => {
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Santiago',
      timeZoneName: 'shortOffset'
    });
    const parts = dtf.formatToParts(dateObj);
    const tzPart = parts.find(p => p.type === 'timeZoneName');
    if (tzPart) {
      const match = tzPart.value.match(/GMT([+-])(\d+)(?::(\d+))?/);
      if (match) {
        const sign = match[1];
        const hours = match[2].padStart(2, '0');
        const mins = (match[3] || '00').padStart(2, '0');
        return `${sign}${hours}:${mins}`;
      }
    }
  } catch (e) {
    console.warn('Error al calcular offset de Santiago:', e);
  }
  return '-03:00';
};

/**
 * Normalización estricta de fechas y horas para Google Calendar API (RFC 3339 / America/Santiago).
 * Soluciona de raíz el error 'Invalid start time'.
 * 
 * - Si tiene hora específica:
 *   patchStart:  { dateTime: 'YYYY-MM-DDTHH:mm:00-03:00', timeZone: 'America/Santiago', date: null }
 *   patchEnd:    { dateTime: 'YYYY-MM-DDTHH:mm:00-03:00', timeZone: 'America/Santiago', date: null }
 * - Si no tiene hora (All-day):
 *   patchStart:  { date: 'YYYY-MM-DD', dateTime: null }
 *   patchEnd:    { date: 'YYYY-MM-DD_MAS_1_DIA', dateTime: null } (exclusivo para Google Calendar).
 */
export const formatGoogleCalendarDates = (fechaInicio, horaInicio = null, fechaFin = null, horaFin = null) => {
  if (!fechaInicio) {
    throw new Error('La fecha de inicio es requerida para sincronizar con Google Calendar.');
  }

  // 1. Extraer fecha y hora de inicio (manejando strings combinados como 'YYYY-MM-DDTHH:mm')
  let rawDateStart = fechaInicio;
  let rawTimeStart = horaInicio;

  if (typeof fechaInicio === 'string' && (fechaInicio.includes('T') || fechaInicio.includes(' '))) {
    const sep = fechaInicio.includes('T') ? 'T' : ' ';
    const parts = fechaInicio.split(sep);
    rawDateStart = parts[0];
    if (!rawTimeStart && parts[1]) {
      const candidate = parts[1].trim();
      if (!candidate.startsWith('00:00') && candidate !== '') {
        rawTimeStart = candidate;
      }
    }
  }

  const ymdStart = normalizeDateStringToYMD(rawDateStart);
  if (!ymdStart) {
    throw new Error(`Fecha de inicio inválida: "${fechaInicio}"`);
  }

  // 2. Extraer fecha y hora de fin
  let rawDateEnd = fechaFin || rawDateStart;
  let rawTimeEnd = horaFin;

  if (typeof fechaFin === 'string' && (fechaFin.includes('T') || fechaFin.includes(' '))) {
    const sep = fechaFin.includes('T') ? 'T' : ' ';
    const parts = fechaFin.split(sep);
    rawDateEnd = parts[0];
    if (!rawTimeEnd && parts[1]) {
      const candidate = parts[1].trim();
      if (!candidate.startsWith('00:00') && candidate !== '') {
        rawTimeEnd = candidate;
      }
    }
  }

  const ymdEnd = normalizeDateStringToYMD(rawDateEnd) || ymdStart;

  const timeStart = normalizeTimeString(rawTimeStart);
  const timeEnd = normalizeTimeString(rawTimeEnd);

  // CASO A: Evento con horario específico (Timed Event)
  if (timeStart) {
    const [sY, sM, sD] = ymdStart.split('-').map(Number);
    const [sH, sMin, sSec] = timeStart.split(':').map(Number);
    const startDateObj = new Date(sY, sM - 1, sD, sH, sMin, sSec || 0);
    const offsetStart = getSantiagoOffset(startDateObj);
    const startDateTimeStr = `${ymdStart}T${timeStart}${offsetStart}`;

    let endDateTimeStr;
    if (timeEnd) {
      const [eY, eM, eD] = ymdEnd.split('-').map(Number);
      const [eH, eMin, eSec] = timeEnd.split(':').map(Number);
      let endDateObj = new Date(eY, eM - 1, eD, eH, eMin, eSec || 0);
      if (isNaN(endDateObj.getTime()) || endDateObj.getTime() <= startDateObj.getTime()) {
        endDateObj = new Date(startDateObj.getTime() + 2 * 60 * 60 * 1000);
      }
      const endY = endDateObj.getFullYear();
      const endM = String(endDateObj.getMonth() + 1).padStart(2, '0');
      const endD = String(endDateObj.getDate()).padStart(2, '0');
      const endH = String(endDateObj.getHours()).padStart(2, '0');
      const endMin = String(endDateObj.getMinutes()).padStart(2, '0');
      const endSec = String(endDateObj.getSeconds()).padStart(2, '0');
      const offsetEnd = getSantiagoOffset(endDateObj);
      endDateTimeStr = `${endY}-${endM}-${endD}T${endH}:${endMin}:${endSec}${offsetEnd}`;
    } else {
      const endDateObj = new Date(startDateObj.getTime() + 2 * 60 * 60 * 1000);
      const endY = endDateObj.getFullYear();
      const endM = String(endDateObj.getMonth() + 1).padStart(2, '0');
      const endD = String(endDateObj.getDate()).padStart(2, '0');
      const endH = String(endDateObj.getHours()).padStart(2, '0');
      const endMin = String(endDateObj.getMinutes()).padStart(2, '0');
      const endSec = String(endDateObj.getSeconds()).padStart(2, '0');
      const offsetEnd = getSantiagoOffset(endDateObj);
      endDateTimeStr = `${endY}-${endM}-${endD}T${endH}:${endMin}:${endSec}${offsetEnd}`;
    }

    return {
      patchStart: { dateTime: startDateTimeStr, timeZone: 'America/Santiago', date: null },
      patchEnd: { dateTime: endDateTimeStr, timeZone: 'America/Santiago', date: null },
      insertStart: { dateTime: startDateTimeStr, timeZone: 'America/Santiago' },
      insertEnd: { dateTime: endDateTimeStr, timeZone: 'America/Santiago' },
      isAllDay: false
    };
  }

  // CASO B: Evento de día completo (All-Day Event)
  // Google Calendar exige que 'end.date' sea exclusivo (el día siguiente al último día del evento)
  const [ey, em, ed] = ymdEnd.split('-').map(Number);
  const endPlusOne = new Date(ey, em - 1, ed);
  endPlusOne.setDate(endPlusOne.getDate() + 1);

  const plusOneY = endPlusOne.getFullYear();
  const plusOneM = String(endPlusOne.getMonth() + 1).padStart(2, '0');
  const plusOneD = String(endPlusOne.getDate()).padStart(2, '0');
  const endExclusiveDate = `${plusOneY}-${plusOneM}-${plusOneD}`;

  return {
    patchStart: { date: ymdStart, dateTime: null },
    patchEnd: { date: endExclusiveDate, dateTime: null },
    insertStart: { date: ymdStart },
    insertEnd: { date: endExclusiveDate },
    isAllDay: true
  };
};

export const syncServiceToCalendar = async (servicio, clienteName, items = []) => {
  if (!gapiInited || !gsisInited) {
    throw new Error('La API de Google o el cliente de autenticación no se han cargado correctamente en este momento.');
  }
  
  // Si no hay fecha de inicio, no podemos crear evento en Google Calendar
  if (!servicio || !servicio.fechaInicio) {
    console.log('Servicio sin fecha de inicio, saltando sincronización con Google Calendar');
    return null;
  }

  // 1. Normalización estricta de fechas y horas
  const dateStructure = formatGoogleCalendarDates(
    servicio.fechaInicio,
    servicio.horaInicio,
    servicio.fechaFin,
    servicio.horaFin
  );

  // 2. Conteo de equipos (Audífonos y Transmisores)
  const totalAudifonos = items
    .filter(i => /audifono/i.test(i.descripcion || ''))
    .reduce((acc, i) => acc + (Number(i.cantidad) || 0), 0);

  const totalTX = items
    .filter(i => /transmisor|\btx\b/i.test(i.descripcion || ''))
    .reduce((acc, i) => acc + (Number(i.cantidad) || 0), 0);

  let equiposTag = '';
  if (totalAudifonos > 0 && totalTX > 0) {
    equiposTag = ` (${totalAudifonos} Audífonos / ${totalTX} TX)`;
  } else if (totalAudifonos > 0) {
    equiposTag = ` (${totalAudifonos} Audífonos)`;
  } else if (totalTX > 0) {
    equiposTag = ` (${totalTX} TX)`;
  }

  // 3. Título dinámico del evento en Google Calendar: [ESTADO] Cliente — Evento (X Audífonos / Y TX)
  const estadoUpper = (servicio.etapa || 'Cotizado').toUpperCase();
  const clienteLabel = clienteName || 'Cliente';
  const eventoLabel = servicio.idServicio ? `Servicio ${servicio.idServicio}` : 'Evento EcoSilence';
  const summary = `[${estadoUpper}] ${clienteLabel} — ${eventoLabel}${equiposTag}`;

  // 4. Cálculo financiero y estado de pago
  const subtotalGeneral = items.reduce((acc, item) => {
    return acc + ((Number(item.cantidad) || 0) * (Number(item.dias) || 0) * (Number(item.precioUnitario) || 0));
  }, 0);
  const descuentoPorc = Number(servicio.descuento) || 0;
  const descuentoMonto = Math.round(subtotalGeneral * (descuentoPorc / 100));
  const montoNeto = Math.round(subtotalGeneral - descuentoMonto);
  const iva = Math.round(montoNeto * 0.19);
  const totalConIva = montoNeto + iva;

  const abono50 = Math.round(totalConIva * 0.5);
  let estadoPagoTexto = '';
  if (servicio.etapa === 'Pagado') {
    estadoPagoTexto = `✅ PAGADO TOTAL ($${totalConIva.toLocaleString('es-CL')})`;
  } else if (servicio.pagoAdelanto) {
    const saldoPendiente = totalConIva - abono50;
    estadoPagoTexto = `🟡 Abono 50% PAGADO ($${abono50.toLocaleString('es-CL')}) | Saldo pendiente: $${saldoPendiente.toLocaleString('es-CL')}`;
  } else {
    estadoPagoTexto = `❌ Abono 50% PENDIENTE ($${abono50.toLocaleString('es-CL')}) | Total por cobrar: $${totalConIva.toLocaleString('es-CL')}`;
  }

  // 5. Detalle de equipos para la descripción
  const detalleEquipos = items.length > 0
    ? items.map(item => {
        const itemTot = (Number(item.cantidad) || 0) * (Number(item.dias) || 0) * (Number(item.precioUnitario) || 0);
        return `• ${item.cantidad}x ${item.descripcion} (${item.dias} días) — $${itemTot.toLocaleString('es-CL')}`;
      }).join('\n')
    : '(Sin equipos agregados a la cotización)';

  // 6. Descripción enriquecida y actualizada
  const description = [
    `SERVICIO ECOSILENCE — ${servicio.idServicio || ''}`,
    `Estado: [${estadoUpper}]`,
    `Cliente: ${clienteLabel}`,
    `Ubicación: ${servicio.direccionEvento || 'No especificada'}`,
    '',
    `--- ESTADO FINANCIERO Y PAGO ---`,
    `Monto Neto: $${montoNeto.toLocaleString('es-CL')}${descuentoPorc > 0 ? ` (Descuento ${descuentoPorc}%: -$${descuentoMonto.toLocaleString('es-CL')})` : ''}`,
    `IVA (19%): $${iva.toLocaleString('es-CL')}`,
    `Total c/IVA: $${totalConIva.toLocaleString('es-CL')}`,
    `Estado de Pago: ${estadoPagoTexto}`,
    '',
    `--- EQUIPOS COTIZADOS ---`,
    detalleEquipos
  ].join('\n');

  const baseResource = {
    summary,
    location: servicio.direccionEvento || '',
    description,
    colorId: STAGE_COLORS[servicio.etapa] || '8'
  };

  const patchResource = {
    ...baseResource,
    start: dateStructure.patchStart,
    end: dateStructure.patchEnd
  };

  const insertResource = {
    ...baseResource,
    start: dateStructure.insertStart,
    end: dateStructure.insertEnd
  };

  try {
    let response;
    if (servicio.googleEventId) {
      try {
        // Intentar actualizar vía PATCH con limpieza explícita de campos previos (date/dateTime null)
        response = await window.gapi.client.calendar.events.patch({
          calendarId: 'primary',
          eventId: servicio.googleEventId,
          resource: patchResource
        });
      } catch (patchErr) {
        console.warn('events.patch falló, ejecutando recuperación resiliente:', patchErr);
        const errMsg = patchErr.result?.error?.message || patchErr.message || '';
        const isConflictOr400 = 
          patchErr.status === 400 || 
          patchErr.status === 404 || 
          patchErr.code === 400 || 
          patchErr.code === 404 ||
          /invalid start|invalid end|not found/i.test(errMsg);

        if (isConflictOr400) {
          // Intentar reemplazo completo mediante events.update
          try {
            response = await window.gapi.client.calendar.events.update({
              calendarId: 'primary',
              eventId: servicio.googleEventId,
              resource: insertResource
            });
          } catch (updateErr) {
            console.warn('events.update también falló, recreando nuevo evento limpio en Google Calendar:', updateErr);
            // Si el ID antiguo en Google está corrupto o incompatible, limpiamos y creamos uno nuevo
            try {
              await window.gapi.client.calendar.events.delete({
                calendarId: 'primary',
                eventId: servicio.googleEventId
              });
            } catch (_) {}

            response = await window.gapi.client.calendar.events.insert({
              calendarId: 'primary',
              resource: insertResource
            });
          }
        } else {
          throw patchErr;
        }
      }
    } else {
      // Crear nuevo evento vía POST
      response = await window.gapi.client.calendar.events.insert({
        calendarId: 'primary',
        resource: insertResource
      });
    }

    const eventId = response.result.id;
    return eventId;
  } catch (err) {
    console.error('Error sincronizando con Google Calendar:', err);
    
    const isUnauthenticated = 
      err.status === 401 || 
      err.code === 401 || 
      (err.result && err.result.error && (err.result.error.code === 401 || err.result.error.status === 'UNAUTHENTICATED'));
    
    if (isUnauthenticated) {
      console.log('Token de Google vencido o no válido, intentando restaurar o re-autenticar...');
      if (restoreGoogleToken()) {
        return syncServiceToCalendar(servicio, clienteName, items);
      }
      try {
        await authenticateGoogle(false);
        return syncServiceToCalendar(servicio, clienteName, items);
      } catch (authErr) {
        console.error('Error de autenticación interactiva:', authErr);
        throw new Error('Tu sesión de Google Calendar ha caducado. Por favor, haz clic en el botón "Vincular Google Calendar" para autorizar.');
      }
    }
    
    const isNotFound = 
      err.status === 404 || 
      err.code === 404 || 
      (err.result && err.result.error && err.result.error.code === 404);
      
    if (isNotFound && servicio.googleEventId) {
      console.log('Evento no encontrado en Google Calendar (posiblemente borrado fuera del CRM), creando nuevo evento...');
      const { googleEventId, ...servicioSinId } = servicio;
      return syncServiceToCalendar(servicioSinId, clienteName, items);
    }
    
    throw err;
  }
};

export const syncMarketingPostToCalendar = async (post, accountName) => {
  if (!gapiInited || !gsisInited) return null;

  const event = {
    'summary': `📱 [POST] ${post.title} - ${accountName}`,
    'description': `Publicación planificada vía EcoSilence Marketing\nTipo: ${post.type}\nCuenta: ${accountName}\n\nCopy Sugerido:\n${post.copy || ''}`,
    'start': { 'date': post.date },
    'end': { 'date': post.date }, // Evento de todo el día
    'colorId': '2' // Color Salvia (Sage) para marketing
  };

  try {
    let request;
    if (post.googleEventId) {
      request = window.gapi.client.calendar.events.patch({
        'calendarId': 'primary',
        'eventId': post.googleEventId,
        'resource': event,
      });
    } else {
      request = window.gapi.client.calendar.events.insert({
        'calendarId': 'primary',
        'resource': event,
      });
    }

    const response = await request;
    return response.result.id;
  } catch (err) {
    console.error('Error sincronizando post de marketing:', err);
    if (err.status === 401) {
      await authenticateGoogle();
      return syncMarketingPostToCalendar(post, accountName);
    }
    if (err.status === 404 && post.googleEventId) {
      const { googleEventId, ...postSinId } = post;
      return syncMarketingPostToCalendar(postSinId, accountName);
    }
    return null;
  }
};

export const deleteCalendarEvent = async (eventId) => {
  if (!gapiInited || !eventId) return;
  try {
    await window.gapi.client.calendar.events.delete({
      'calendarId': 'primary',
      'eventId': eventId,
    });
  } catch (err) {
    console.error('Error eliminando evento de Google Calendar:', err);
  }
};

/**
 * GOOGLE DRIVE FUNCTIONS
 */

export const listDriveContent = async (parentId = null, rootFolderName = 'redes ecosilence', type = 'media') => {
  if (!gapiInited || !gsisInited || !window.gapi.client.drive) {
    console.error('Google Drive API not initialized');
    return { folders: [], files: [] };
  }
  
  try {
    let targetParentId = parentId;

    // Si no hay parentId, buscamos la carpeta raíz por nombre
    if (!targetParentId) {
      const rootRes = await window.gapi.client.drive.files.list({
        q: `name = '${rootFolderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id, name)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });
      targetParentId = rootRes.result.files[0]?.id;
      if (!targetParentId) return { folders: [], files: [] };
    }

    // Listar contenido del parentId (carpetas y archivos)
    const res = await window.gapi.client.drive.files.list({
      q: `'${targetParentId}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType, webViewLink, thumbnailLink, size, createdTime)',
      orderBy: 'folder, name',
      pageSize: 1000,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    const items = res.result.files || [];
    const folders = items.filter(i => i.mimeType === 'application/vnd.google-apps.folder').map(f => ({
      id: f.id,
      name: f.name,
      type: 'folder'
    }));

    const files = items.filter(i => {
      if (i.mimeType === 'application/vnd.google-apps.folder') return false;
      if (type === 'pdf') return i.mimeType === 'application/pdf';
      return i.mimeType.includes('image/') || i.mimeType.includes('video/');
    }).map(f => ({
      id: f.id,
      name: f.name,
      type: f.mimeType.includes('video') ? 'video' : (f.mimeType === 'application/pdf' ? 'pdf' : 'image'),
      link: f.webViewLink,
      thumb: f.thumbnailLink,
      date: new Date(f.createdTime).toLocaleDateString(),
      size: f.size ? (f.size / (1024 * 1024)).toFixed(1) + ' MB' : 'N/A'
    }));

    return { folders, files, currentFolderId: targetParentId };

  } catch (err) {
    console.error('Error al listar contenido de Drive:', err);
    return { folders: [], files: [] };
  }
};
