/**
 * Servicio para integrar Google Calendar con el CRM de EcoSilence
 */

const CLIENT_ID = '718018729593-1j2gdsri0lfmb21llv6abc10cjpacc3d.apps.googleusercontent.com';
const API_KEY = 'AIzaSyBWlbA1NZOtsP2b7ei6xzPLQBIdNv-KrCY';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/calendar.events';

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
    discoveryDocs: [DISCOVERY_DOC],
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
  const iva = subtotalGeneral * 0.19;
  const totalFinal = subtotalGeneral + iva;

  // Formatear el detalle de equipos para la descripción incluyendo precios
  const detalleEquipos = items.length > 0 
    ? '\n\nDETALLE DE EQUIPOS:\n' + items.map(item => {
        const total = (item.cantidad || 0) * (item.dias || 0) * (item.precioUnitario || 0);
        return `- ${item.cantidad}x ${item.descripcion} (${item.dias} d): $${total.toLocaleString('es-CL')}`;
      }).join('\n') + `\n\nTOTAL COTIZACIÓN:\nSubtotal: $${subtotalGeneral.toLocaleString('es-CL')}\nIVA (19%): $${iva.toLocaleString('es-CL')}\nTOTAL CLP: $${totalFinal.toLocaleString('es-CL')}`
    : '\n\n(No hay equipos agregados aún)';

  // Calcular total de audífonos para el título
  const totalAudifonos = items
    .filter(i => (i.descripcion || '').toLowerCase().includes('audifono'))
    .reduce((acc, i) => acc + (i.cantidad || 0), 0);

  const prefijoAudifonos = totalAudifonos > 0 ? `${totalAudifonos} - ` : '';

  const event = {
    'summary': `${prefijoAudifonos}${clienteName} - ${servicio.idServicio}`,
    'location': servicio.direccionEvento,
    'description': `Servicio de EcoSilence\nEtapa: ${servicio.etapa}\nID: ${servicio.idServicio}${detalleEquipos}`,
    'start': {
      'dateTime': new Date(servicio.fechaInicio).toISOString(),
      'timeZone': 'America/Santiago'
    },
    'end': {
      'dateTime': new Date(servicio.fechaFin).toISOString(),
      'timeZone': 'America/Santiago'
    },
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
