/**
 * Servicio para integrar Google Calendar con el CRM de EcoSilence
 * Incluye Cola de Sincronización desacoplada, reintentos automáticos y token refresh robusto.
 */
import { supabase } from '../supabaseClient';

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

// Mapeo de Etapas a Colores de Google Calendar
const STAGE_COLORS = {
  'Cotizado': '5',
  'Aprobado': '1',
  'Por Cobrar': '11',
  'Pagado': '10'
};

/**
 * Inicialización de Scripts de Google API
 */
export const initGoogleScripts = () => {
  return new Promise((resolve) => {
    const checkReady = () => {
      if (window.gapi && window.google) {
        gapiLoaded();
        gisLoaded();
        resolve(true);
      } else {
        setTimeout(checkReady, 100);
      }
    };
    checkReady();
  });
};

function gapiLoaded() {
  window.gapi.load('client', initializeGapiClient);
}

async function initializeGapiClient() {
  await window.gapi.client.init({
    apiKey: API_KEY,
    discoveryDocs: DISCOVERY_DOCS,
  });
  gapiInited = true;
}

function gisLoaded() {
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: '', 
  });
  gsisInited = true;
}

/**
 * Autenticación OAuth 2.0 y Refresh Token
 */
export const authenticateGoogle = (silent = false) => {
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      return reject(new Error("Token client not initialized"));
    }
    
    tokenClient.callback = async (resp) => {
      if (resp.error !== undefined) {
        reject(resp);
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
 * Valida y refresca el token de Google silenciosamente si es necesario
 */
export const ensureValidToken = async () => {
  const token = window.gapi?.client?.getToken();
  if (!token || !token.access_token) {
    try {
      console.log("Refrescando token de acceso de Google silenciosamente...");
      await authenticateGoogle(true);
    } catch (e) {
      console.warn("La autenticación silenciosa falló, requiere consentimiento visual:", e);
      await authenticateGoogle(false);
    }
  }
};

/**
 * Guarda logs de sincronización en Supabase de forma segura e indolora
 */
export const writeSyncLog = async (servicioId, action, status, googleEventId = null, errorMessage = null) => {
  try {
    const { error } = await supabase.from('sync_logs').insert({
      servicio_id: String(servicioId),
      action,
      status,
      google_event_id: googleEventId,
      error_message: errorMessage
    });
    if (error) {
      console.warn("Supabase sync_logs table write warning (table may not exist):", error.message);
    }
  } catch (err) {
    console.warn("Error recording sync log:", err.message);
  }
};

/**
 * Normaliza los campos de un objeto de servicio para admitir indistintamente camelCase y snake_case
 */
const normalizeServicio = (s) => {
  if (!s) return {};
  return {
    idServicio: s.idServicio || s.id_servicio,
    clienteId: s.clienteId || s.cliente_id,
    direccionEvento: s.direccionEvento || s.direccion_evento,
    fechaInicio: s.fechaInicio || s.fecha_inicio,
    fechaFin: s.fechaFin || s.fecha_fin,
    etapa: s.etapa,
    descuento: s.descuento,
    googleEventId: s.googleEventId || s.google_event_id,
    googleCalendarId: s.googleCalendarId || s.google_calendar_id || 'primary',
    pagoAdelanto: s.pagoAdelanto !== undefined ? s.pagoAdelanto : s.pago_adelanto
  };
};

/**
 * Sincroniza un servicio con Google Calendar
 */
export const syncServiceToCalendar = async (rawServicio, clienteName, items = []) => {
  if (!gapiInited || !gsisInited) return null;
  
  const servicio = normalizeServicio(rawServicio);

  if (!servicio.fechaInicio) {
    console.log(`Servicio ${servicio.idServicio} sin fecha de inicio, omitiendo sincronización.`);
    return null;
  }

  // Prevenir bloqueos: asegurar autenticación del cliente
  await ensureValidToken();

  // Calcular totales
  const subtotalGeneral = items.reduce((acc, item) => acc + ((item.cantidad || 0) * (item.dias || 0) * (item.precioUnitario || 0)), 0);
  const descuentoData = servicio.descuento || 0;
  const descuentoMonto = subtotalGeneral * (descuentoData / 100);
  const neto = subtotalGeneral - descuentoMonto;
  const iva = neto * 0.19;
  const totalFinal = neto + iva;

  let totalesTexto = `\n\nTOTAL COTIZACIÓN:\nSubtotal: $${subtotalGeneral.toLocaleString('es-CL')}`;
  if (descuentoData > 0) {
    totalesTexto += `\nDescuento (${descuentoData}%): -$${descuentoMonto.toLocaleString('es-CL')}`;
  }
  totalesTexto += `\nIVA (19%): $${iva.toLocaleString('es-CL')}\nTOTAL CLP: $${totalFinal.toLocaleString('es-CL')}`;

  const detalleEquipos = items.length > 0 
    ? '\n\nDETALLE DE EQUIPOS:\n' + items.map(item => {
        const total = (item.cantidad || 0) * (item.dias || 0) * (item.precioUnitario || 0);
        return `- ${item.cantidad}x ${item.descripcion || item.nombre_equipo} (${item.dias} d): $${total.toLocaleString('es-CL')}`;
      }).join('\n') + totalesTexto
    : '\n\n(No hay equipos agregados aún)';

  const totalAudifonos = items
    .filter(i => {
      const desc = (i.descripcion || i.nombre_equipo || '').toLowerCase();
      return desc.includes('audifono') || desc.includes('audífonos') || desc.includes('audífono');
    })
    .reduce((acc, i) => acc + (i.cantidad || 0), 0);

  const prefijoAudifonos = totalAudifonos > 0 ? `${totalAudifonos} aud. - ` : '';

  // Determinar si es un evento de todo el día
  const isAllDay = !servicio.fechaInicio.includes('T') || servicio.fechaInicio.endsWith('T00:00');
  const pureDateStart = servicio.fechaInicio.split('T')[0];
  
  const startObj = isAllDay ? 
    { 'date': pureDateStart } : 
    { 'dateTime': new Date(servicio.fechaInicio).toISOString(), 'timeZone': 'America/Santiago' };

  let endObj;
  if (servicio.fechaFin) {
    const isEndAllDay = !servicio.fechaFin.includes('T') || servicio.fechaFin.endsWith('T23:59');
    if (isEndAllDay) {
      const [y, m, d] = servicio.fechaFin.split('T')[0].split('-').map(Number);
      const endD = new Date(y, m - 1, d);
      endD.setDate(endD.getDate() + 1);
      
      const resY = endD.getFullYear();
      const resM = String(endD.getMonth() + 1).padStart(2, '0');
      const resD = String(endD.getDate()).padStart(2, '0');
      
      endObj = { 'date': `${resY}-${resM}-${resD}` };
    } else {
      endObj = { 'dateTime': new Date(servicio.fechaFin).toISOString(), 'timeZone': 'America/Santiago' };
    }
  } else {
    if (isAllDay) {
      const [y, m, d] = pureDateStart.split('-').map(Number);
      const endD = new Date(y, m - 1, d);
      endD.setDate(endD.getDate() + 1);
      const resY = endD.getFullYear();
      const resM = String(endD.getMonth() + 1).padStart(2, '0');
      const resD = String(endD.getDate()).padStart(2, '0');
      endObj = { 'date': `${resY}-${resM}-${resD}` };
    } else {
      const endD = new Date(servicio.fechaInicio);
      endD.setHours(endD.getHours() + 1);
      endObj = { 'dateTime': endD.toISOString(), 'timeZone': 'America/Santiago' };
    }
  }

  const event = {
    'summary': `🎧 ${prefijoAudifonos}${clienteName} - ${servicio.idServicio}`,
    'location': servicio.direccionEvento,
    'description': `Servicio de EcoSilence\nEtapa: ${servicio.etapa}\nReserva (50%): ${servicio.pagoAdelanto ? '✅ PAGADA' : '❌ PENDIENTE'}\nID: ${servicio.idServicio}${detalleEquipos}`,
    'start': startObj,
    'end': endObj,
    'colorId': STAGE_COLORS[servicio.etapa] || '8'
  };

  try {
    let request;
    const targetCalendarId = servicio.googleCalendarId || 'primary';
    
    if (servicio.googleEventId) {
      request = window.gapi.client.calendar.events.patch({
        'calendarId': targetCalendarId,
        'eventId': servicio.googleEventId,
        'resource': event,
      });
    } else {
      request = window.gapi.client.calendar.events.insert({
        'calendarId': targetCalendarId,
        'resource': event,
      });
    }

    const response = await request;
    const eventId = response.result.id;

    // Registrar Log de Éxito
    await writeSyncLog(servicio.idServicio, servicio.googleEventId ? 'UPDATE' : 'INSERT', 'SUCCESS', eventId);
    return eventId;

  } catch (err) {
    console.error('Error en syncServiceToCalendar:', err);
    await writeSyncLog(servicio.idServicio, servicio.googleEventId ? 'UPDATE' : 'INSERT', 'ERROR', servicio.googleEventId, err.message || JSON.stringify(err));
    
    if (err.status === 401) {
       await authenticateGoogle();
       return syncServiceToCalendar(servicio, clienteName, items);
    }
    
    if (err.status === 404 && servicio.googleEventId) {
      console.log('El evento original fue eliminado de Google. Re-creándolo...');
      const { googleEventId, ...servicioSinId } = servicio;
      return syncServiceToCalendar(servicioSinId, clienteName, items);
    }
    
    return null;
  }
};

/**
 * Elimina un evento de Google Calendar
 */
export const deleteCalendarEvent = async (eventId, calendarId = 'primary') => {
  if (!gapiInited || !eventId) return;
  try {
    await ensureValidToken();
    await window.gapi.client.calendar.events.delete({
      'calendarId': calendarId || 'primary',
      'eventId': eventId,
    });
    await writeSyncLog('N/A', 'DELETE', 'SUCCESS', eventId);
  } catch (err) {
    console.error('Error eliminando evento de Google Calendar:', err);
    await writeSyncLog('N/A', 'DELETE', 'ERROR', eventId, err.message);
  }
};

/**
 * Sincroniza publicaciones planificadas de Marketing a Google Calendar
 */
export const syncMarketingPostToCalendar = async (post, accountName) => {
  if (!gapiInited || !gsisInited) return null;

  await ensureValidToken();

  const event = {
    'summary': `📱 [POST] ${post.title} - ${accountName}`,
    'description': `Publicación planificada vía EcoSilence Marketing\nTipo: ${post.type}\nCuenta: ${accountName}\n\nCopy Sugerido:\n${post.copy || ''}`,
    'start': { 'date': post.date },
    'end': { 'date': post.date }, 
    'colorId': '2' 
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

/**
 * Cola de Sincronización Desacoplada (CalendarSyncQueue)
 * Permite ejecutar la sincronización en segundo plano de manera no bloqueante.
 */
class CalendarSyncQueueManager {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.retryDelay = 5000; // 5 segundos base
  }

  push(task) {
    this.queue.push(task);
    console.log(`Nueva tarea añadida a la cola de sincronización. Pendientes: ${this.queue.length}`);
    this.processNext();
  }

  async processNext() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    const task = this.queue[0];
    let attempts = task.attempts || 0;

    try {
      console.log(`Procesando tarea de sincronización: ${task.action} para servicio ${task.payload.servicio?.idServicio || task.payload.idServicio}`);
      
      if (task.action === 'SYNC') {
        const { servicio, clienteName, items, callback } = task.payload;
        const eventId = await syncServiceToCalendar(servicio, clienteName, items);
        if (callback) callback(eventId);

      } else if (task.action === 'DELETE') {
        const { googleEventId, googleCalendarId } = task.payload;
        await deleteCalendarEvent(googleEventId, googleCalendarId);
      }

      // Éxito: removemos de la cola
      this.queue.shift();
      console.log("Tarea completada con éxito.");

    } catch (error) {
      console.error("Error procesando tarea en cola:", error);
      attempts++;
      
      if (attempts >= 3) {
        console.error("Superado el límite de 3 reintentos para la sincronización. Tarea descartada.");
        this.queue.shift();
      } else {
        task.attempts = attempts;
        console.log(`Reintentando tarea en ${this.retryDelay * attempts}ms... (Intento ${attempts}/3)`);
        // Mover al final de la cola y re-programar
        this.queue.push(this.queue.shift());
      }
    }

    this.processing = false;
    setTimeout(() => this.processNext(), 1000);
  }
}

export const CalendarSyncQueue = new CalendarSyncQueueManager();

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
