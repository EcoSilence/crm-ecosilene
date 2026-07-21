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
  if (!gapiInited || !gsisInited) {
    throw new Error('La API de Google o el cliente de autenticación no se han cargado correctamente en este momento.');
  }
  
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
    
    const isUnauthenticated = 
      err.status === 401 || 
      err.code === 401 || 
      (err.result && err.result.error && (err.result.error.code === 401 || err.result.error.status === 'UNAUTHENTICATED'));
    
    if (isUnauthenticated) {
       console.log('Token de Google vencido o no válido, iniciando autenticación interactiva...');
       try {
         await authenticateGoogle(false);
         return syncServiceToCalendar(servicio, clienteName, items);
       } catch (authErr) {
         console.error('Error de autenticación interactiva:', authErr);
         throw authErr;
       }
    }
    
    const isNotFound = 
      err.status === 404 || 
      err.code === 404 || 
      (err.result && err.result.error && err.result.error.code === 404);
      
    if (isNotFound && servicio.googleEventId) {
      console.log('Evento no encontrado en Google, re-creando...');
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
