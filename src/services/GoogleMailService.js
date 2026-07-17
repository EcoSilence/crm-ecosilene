/**
 * Servicio aislado para interactuar con la API de Gmail de Google
 */

/**
 * Codifica un correo electrónico en formato RFC 2822 y base64url para la API de Gmail.
 */
const encodeEmail = (to, subject, bodyHtml) => {
  const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
  const emailPart = [
    `To: ${to}`,
    'Content-Type: text/html; charset="UTF-8"',
    'MIME-Version: 1.0',
    `Subject: ${utf8Subject}`,
    '',
    bodyHtml
  ].join('\r\n');

  // Convertir a base64url
  return btoa(unescape(encodeURIComponent(emailPart)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

/**
 * Envía un correo electrónico individual usando el GAPI Client.
 */
export const sendGmailMessage = async (to, subject, bodyHtml) => {
  if (!window.gapi || !window.gapi.client || !window.gapi.client.gmail) {
    throw new Error('La API de Gmail de Google no está cargada o inicializada.');
  }

  const rawMessage = encodeEmail(to, subject, bodyHtml);
  
  try {
    const response = await window.gapi.client.gmail.users.messages.send({
      userId: 'me',
      resource: {
        raw: rawMessage
      }
    });
    return response.result;
  } catch (error) {
    console.error('Error al enviar correo por Gmail API:', error);
    throw error;
  }
};

/**
 * Envía correos masivos en lotes asíncronos respetando los límites de Google.
 * @param {Array<string>} recipients Lista de correos
 * @param {string} subject Asunto del correo
 * @param {string} bodyHtml Cuerpo del correo en HTML
 * @param {Function} onProgress Callback de progreso (sentCount, totalCount, currentEmail, status)
 * @param {number} batchSize Tamaño del lote (defecto: 5)
 * @param {number} delayBetweenMs Delay entre correos en milisegundos (defecto: 1000)
 */
export const sendMassEmailsInBatches = async (
  recipients,
  subject,
  bodyHtml,
  onProgress = () => {},
  batchSize = 5,
  delayBetweenMs = 1000
) => {
  const total = recipients.length;
  let sentCount = 0;
  const results = { success: [], failed: [] };

  for (let i = 0; i < total; i += batchSize) {
    const currentBatch = recipients.slice(i, i + batchSize);
    
    // Procesar lote en paralelo
    const promises = currentBatch.map(async (email) => {
      try {
        onProgress(sentCount, total, email, 'sending');
        await sendGmailMessage(email, subject, bodyHtml);
        results.success.push(email);
        sentCount++;
        onProgress(sentCount, total, email, 'success');
      } catch (err) {
        console.error(`Fallo al enviar correo a: ${email}`, err);
        results.failed.push({ email, error: err.message || err.error || 'Error desconocido' });
        sentCount++;
        onProgress(sentCount, total, email, 'failed');
      }
      
      // Delay entre correos individuales para evitar picos de uso
      await new Promise((resolve) => setTimeout(resolve, delayBetweenMs));
    });

    await Promise.all(promises);
    
    // Esperar un delay extra entre lotes
    if (i + batchSize < total) {
      await new Promise((resolve) => setTimeout(resolve, delayBetweenMs * 2));
    }
  }

  return results;
};
