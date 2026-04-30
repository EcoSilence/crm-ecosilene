/**
 * Servicio para integrar Google Calendar con el CRM de EcoSilence
 */

const CLIENT_ID = '718018729593-1j2gdsri0lfmb21llv6abc10cjpacc3d.apps.googleusercontent.com';
const API_KEY = 'AIzaSyBWlbA1NZOtsP2b7ei6xzPLQBIdNv-KrCY';
const DISCOVERY_DOCS = [
  'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest',
  'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'
];
const SCOPES = 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/drive.readonly';

let gapiInited = false;
let gsisInited = false;
let tokenClient;

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
    callback: '', // definido en el momento del uso
  });
  gsisInited = true;
}

export const authenticateGoogle = (silent = false) => {
  return new Promise((resolve, reject) => {
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

export const syncServiceToCalendar = async (servicio, clienteName, items = []) => {
  if (!gapiInited || !gsisInited) return null;
  
  // Si no hay fecha de inicio, no podemos crear evento en Google Calendar
  if (!servicio.fechaInicio) {
    console.log('Servicio sin fecha de inicio, saltando sincronización con Google Calendar');
    return null;
  }

  // Calcular totales
  const subtotalGeneral = items.reduce((acc, item) => acc + ((item.cantidad || 0) * (item.dias || 0) * (item.precioUnitario || 0)), 0);
  const descuentoData = servicio.descuento || 0;
  const descuentoMonto = subtotalGeneral * (descuentoData / 100);
  const neto = subtotalGeneral - descuentoMonto;
  const iva = neto * 0.19;
  const totalFinal = neto + iva;

  // Formatear el detalle de equipos para la descripción incluyendo precios
  let totalesTexto = `\n\nTOTAL COTIZACIÓN:\nSubtotal: $${subtotalGeneral.toLocaleString('es-CL')}`;
  if (descuentoData > 0) {
    totalesTexto += `\nDescuento (${descuentoData}%): -$${descuentoMonto.toLocaleString('es-CL')}`;
  }
  totalesTexto += `\nIVA (19%): $${iva.toLocaleString('es-CL')}\nTOTAL CLP: $${totalFinal.toLocaleString('es-CL')}`;

  const detalleEquipos = items.length > 0 
    ? '\n\nDETALLE DE EQUIPOS:\n' + items.map(item => {
        const total = (item.cantidad || 0) * (item.dias || 0) * (item.precioUnitario || 0);
        return `- ${item.cantidad}x ${item.descripcion} (${item.dias} d): $${total.toLocaleString('es-CL')}`;
      }).join('\n') + totalesTexto
    : '\n\n(No hay equipos agregados aún)';

  // Calcular total de audífonos para el título
  const totalAudifonos = items
    .filter(i => (i.descripcion || '').toLowerCase().includes('audifono'))
    .reduce((acc, i) => acc + (i.cantidad || 0), 0);

  const prefijoAudifonos = totalAudifonos > 0 ? `${totalAudifonos} - ` : '';

  // Determinar si es un evento de todo el día (si no tiene 'T' o tiene 'T00:00')
  const isAllDay = !servicio.fechaInicio.includes('T') || servicio.fechaInicio.endsWith('T00:00');
  
  // Limpiar la cadena para obtener YYYY-MM-DD
  const pureDateStart = servicio.fechaInicio.split('T')[0];
  
  const startObj = isAllDay ? 
    { 'date': pureDateStart } : 
    { 'dateTime': new Date(servicio.fechaInicio).toISOString(), 'timeZone': 'America/Santiago' };

  let endObj;
  if (servicio.fechaFin) {
    const isEndAllDay = !servicio.fechaFin.includes('T') || servicio.fechaFin.endsWith('T23:59');
    if (isEndAllDay) {
      // Para eventos de todo el día, Google requiere que el 'end' sea el día SIGUIENTE al último día del evento
      const [y, m, d] = servicio.fechaFin.split('T')[0].split('-').map(Number);
      const endD = new Date(y, m - 1, d); // Crear fecha local
      endD.setDate(endD.getDate() + 1);
      
      const resY = endD.getFullYear();
      const resM = String(endD.getMonth() + 1).padStart(2, '0');
      const resD = String(endD.getDate()).padStart(2, '0');
      
      endObj = { 'date': `${resY}-${resM}-${resD}` };
    } else {
      endObj = { 'dateTime': new Date(servicio.fechaFin).toISOString(), 'timeZone': 'America/Santiago' };
    }
  } else {
    // Si no hay fecha de fin, durará 1 día (si es all-day) o 1 hora
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
    'summary': `${prefijoAudifonos}${clienteName} - ${servicio.idServicio}`,
    'location': servicio.direccionEvento,
    'description': `Servicio de EcoSilence\nEtapa: ${servicio.etapa}\nReserva (50%): ${servicio.pagoAdelanto ? '✅ PAGADA' : '❌ PENDIENTE'}\nID: ${servicio.idServicio}${detalleEquipos}`,
    'start': startObj,
    'end': endObj,
    'colorId': STAGE_COLORS[servicio.etapa] || '8'
  };

  try {
    let request;
    if (servicio.googleEventId) {
      // Actualizar evento existente
      request = window.gapi.client.calendar.events.patch({
        'calendarId': 'primary',
        'eventId': servicio.googleEventId,
        'resource': event,
      });
    } else {
      // Crear nuevo evento
      request = window.gapi.client.calendar.events.insert({
        'calendarId': 'primary',
        'resource': event,
      });
    }

    const response = await request;
    return response.result.id;
  } catch (err) {
    console.error('Error sincronizando con Google Calendar:', err);
    if (err.status === 401) {
       // Token expirado, re-autenticar
       await authenticateGoogle();
       return syncServiceToCalendar(servicio, clienteName, items);
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

export const listDriveContent = async (parentId = null, rootFolderName = 'redes ecosilence') => {
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
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    const items = res.result.files || [];
    const folders = items.filter(i => i.mimeType === 'application/vnd.google-apps.folder').map(f => ({
      id: f.id,
      name: f.name,
      type: 'folder'
    }));

    const files = items.filter(i => i.mimeType !== 'application/vnd.google-apps.folder' && (i.mimeType.includes('image/') || i.mimeType.includes('video/'))).map(f => ({
      id: f.id,
      name: f.name,
      type: f.mimeType.includes('video') ? 'video' : 'image',
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
