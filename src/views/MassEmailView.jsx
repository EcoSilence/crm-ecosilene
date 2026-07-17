import React, { useState, useMemo } from 'react';
import { useAppStore } from '../context/AppDataContext';
import { useToast } from '../context/ToastContext';
import { sendMassEmailsInBatches } from '../services/GoogleMailService';
import { Mail, Users, Check, AlertCircle, RefreshCw, Send, Image as ImageIcon, Layout, Eye, HelpCircle } from 'lucide-react';

const MassEmailView = () => {
  const { clientes, isGoogleLinked, linkGoogle } = useAppStore();
  const { addToast } = useToast();

  // Estados de Formulario
  const [subject, setSubject] = useState('');
  const [selectedClientes, setSelectedClientes] = useState([]);
  
  // Editor del Template de Correo
  const [bannerTitle, setBannerTitle] = useState('Novedades de EcoSilence');
  const [bannerGradient, setBannerGradient] = useState('linear-gradient(135deg,#667eea,#764ba2)');
  const [heading, setHeading] = useState('¡Conoce nuestra experiencia acústica!');
  const [bodyText, setBodyText] = useState('Te invitamos a descubrir cómo nuestras soluciones de sonido y eventos silenciosos transforman la experiencia de tus clientes.');
  const [imageUrl, setImageUrl] = useState('');
  const [ctaText, setCtaText] = useState('Visitar EcoSilence');
  const [ctaLink, setCtaLink] = useState('https://ecosilence.cl');

  // Estados de Envío y Progreso
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, email: '', status: '' });
  const [results, setResults] = useState(null);
  const [sendingLogs, setSendingLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('compose'); // 'compose' | 'recipients' | 'preview'

  // Generar HTML completo con las reglas de email-design
  const compiledHtml = useMemo(() => {
    const bannerStyle = `background: ${bannerGradient};`;
    const imageTag = imageUrl 
      ? `<div style="text-align:center;padding:10px 0;"><img src="${imageUrl}" alt="Flyer del Evento" width="560" style="display:block;max-width:100%;height:auto;border-radius:8px;border:0;margin:0 auto;" /></div>`
      : '';

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject || 'EcoSilence Newsletter'}</title>
</head>
<body style="margin:0;padding:0;background-color:#f8f9fa;font-family:Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#f8f9fa">
    <tr>
      <td align="center" style="padding:20px 10px;">
        <!-- Contenedor Max 600px -->
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.05);">
          
          <!-- Banner Superior CSS-Only (Garantiza visualización) -->
          <tr>
            <td align="center" style="${bannerStyle}padding:40px 20px;text-align:center;">
              <h1 style="color:#ffffff;font-size:32px;margin:0;font-weight:bold;letter-spacing:1px;text-shadow:0 2px 4px rgba(0,0,0,0.1);">${bannerTitle}</h1>
            </td>
          </tr>

          <!-- Contenido Principal -->
          <tr>
            <td style="padding:40px 30px;">
              <h2 style="color:#2d3748;font-size:22px;margin:0 0 16px;font-weight:bold;line-height:1.3;">${heading}</h2>
              <p style="color:#4a5568;font-size:15px;line-height:1.6;margin:0 0 24px;">${bodyText.replace(/\n/g, '<br />')}</p>
              
              <!-- Imagen Opcional -->
              ${imageTag}

              <!-- Botón Bulletproof CTA -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:24px 0 0 0;">
                <tr>
                  <td align="center">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" bgcolor="#2563eb" style="border-radius:6px;">
                          <a href="${ctaLink}" target="_blank" style="font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;padding:14px 28px;display:inline-block;">
                            ${ctaText}
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer con exclusión opcional obligatoria de Ley -->
          <tr>
            <td align="center" style="padding:20px 30px;background-color:#edf2f7;font-size:12px;color:#718096;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="margin:0 0 6px 0;"><strong>EcoSilence CRM</strong> — Soluciones de Audio y Eventos</p>
              <p style="margin:0;">Recibiste este correo porque estás registrado en nuestra base de datos. <a href="#" style="color:#2563eb;text-decoration:underline;">Anular suscripción</a></p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }, [bannerTitle, bannerGradient, heading, bodyText, imageUrl, ctaText, ctaLink, subject]);

  const handleSelectAll = () => {
    if (selectedClientes.length === clientes.length) {
      setSelectedClientes([]);
    } else {
      setSelectedClientes(clientes.map(c => c.email).filter(Boolean));
    }
  };

  const handleToggleCliente = (email) => {
    if (selectedClientes.includes(email)) {
      setSelectedClientes(selectedClientes.filter(e => e !== email));
    } else {
      setSelectedClientes([...selectedClientes, email]);
    }
  };

  const handleSend = async () => {
    if (!isGoogleLinked) {
      addToast('Debes vincular tu cuenta de Google primero para enviar correos.', 'warning');
      return;
    }
    if (selectedClientes.length === 0) {
      addToast('Por favor selecciona al menos un destinatario.', 'warning');
      return;
    }
    if (!subject.trim()) {
      addToast('El asunto del correo no puede estar vacío.', 'warning');
      return;
    }

    setIsSending(true);
    setSendingLogs([]);
    setResults(null);

    try {
      const deliveryResults = await sendMassEmailsInBatches(
        selectedClientes,
        subject,
        compiledHtml,
        (current, total, email, status) => {
          setProgress({ current, total, email, status });
          const timestamp = new Date().toLocaleTimeString();
          if (status === 'success') {
            setSendingLogs(prev => [`[${timestamp}] Enviado con éxito a: ${email}`, ...prev]);
          } else if (status === 'failed') {
            setSendingLogs(prev => [`[${timestamp}] ❌ Error al enviar a: ${email}`, ...prev]);
          }
        },
        5, // Lote de 5
        1200 // Esperar 1.2 segundos entre correos
      );

      setResults(deliveryResults);
      addToast(`Envío masivo finalizado. ${deliveryResults.success.length} exitosos, ${deliveryResults.failed.length} fallidos.`, 'success');
    } catch (error) {
      console.error(error);
      addToast('Fallo en el proceso de envío masivo.', 'error');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '3rem' }}>
      
      {/* Encabezado */}
      <div>
        <h1 style={{ margin: 0, fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <Mail size={30} color="var(--accent-secondary)" /> Envío de Correos Masivo
        </h1>
        <p style={{ margin: '0.3rem 0 0 0', color: 'var(--text-muted)' }}>
          Envía comunicados y flyers de eventos a tu lista de contactos usando la API de Gmail en lotes seguros.
        </p>
      </div>

      {!isGoogleLinked ? (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
          <AlertCircle size={48} color="var(--color-banana)" />
          <div>
            <h3>Se requiere vinculación con Google</h3>
            <p style={{ color: 'var(--text-muted)', maxWidth: '500px', margin: '0.5rem auto 0 auto' }}>
              Para usar el servicio de envíos masivos gratuito de Gmail, debes autorizar el acceso a tu cuenta de Google.
            </p>
          </div>
          <button className="btn btn-primary" onClick={linkGoogle} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <RefreshCw size={18} /> Vincular Cuenta de Google
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
          
          {/* Navegación de pestañas estilo shadcn */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', gap: '1rem', paddingBottom: '0.2rem' }}>
            <button 
              className={`btn ${activeTab === 'compose' ? 'btn-primary' : 'btn-ghost'}`} 
              onClick={() => setActiveTab('compose')}
              style={{ padding: '0.5rem 1.2rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}
            >
              <Layout size={16} /> 1. Redactar Correo
            </button>
            <button 
              className={`btn ${activeTab === 'recipients' ? 'btn-primary' : 'btn-ghost'}`} 
              onClick={() => setActiveTab('recipients')}
              style={{ padding: '0.5rem 1.2rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}
            >
              <Users size={16} /> 2. Destinatarios ({selectedClientes.length})
            </button>
            <button 
              className={`btn ${activeTab === 'preview' ? 'btn-primary' : 'btn-ghost'}`} 
              onClick={() => setActiveTab('preview')}
              style={{ padding: '0.5rem 1.2rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}
            >
              <Eye size={16} /> 3. Vista Previa HTML
            </button>
          </div>

          <div className="responsive-grid-2" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
            
            {/* PANEL PRINCIPAL */}
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              
              {activeTab === 'compose' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                  <div>
                    <label className="input-label" style={{ marginBottom: '0.3rem', display: 'block' }}>Asunto del Correo</label>
                    <input 
                      type="text" 
                      className="input-control" 
                      placeholder="Ej: ¡Invitación especial a nuestro próximo evento silencioso!" 
                      value={subject} 
                      onChange={e => setSubject(e.target.value)} 
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div>
                      <label className="input-label" style={{ marginBottom: '0.3rem', display: 'block' }}>Título del Banner</label>
                      <input 
                        type="text" 
                        className="input-control" 
                        value={bannerTitle} 
                        onChange={e => setBannerTitle(e.target.value)} 
                      />
                    </div>
                    <div>
                      <label className="input-label" style={{ marginBottom: '0.3rem', display: 'block' }}>Fondo Gradiente del Banner</label>
                      <select 
                        className="input-control" 
                        value={bannerGradient} 
                        onChange={e => setBannerGradient(e.target.value)}
                      >
                        <option value="linear-gradient(135deg,#667eea,#764ba2)">Púrpura Elegante</option>
                        <option value="linear-gradient(135deg,#203a43,#2c5364)">Azul Profundo</option>
                        <option value="linear-gradient(135deg,#1f4037,#99f2c8)">Verde EcoSilence</option>
                        <option value="linear-gradient(135deg,#e74c3c,#c0392b)">Rojo Eventos</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="input-label" style={{ marginBottom: '0.3rem', display: 'block' }}>Encabezado Principal del Mensaje</label>
                    <input 
                      type="text" 
                      className="input-control" 
                      value={heading} 
                      onChange={e => setHeading(e.target.value)} 
                    />
                  </div>

                  <div>
                    <label className="input-label" style={{ marginBottom: '0.3rem', display: 'block' }}>Cuerpo / Mensaje Principal</label>
                    <textarea 
                      className="input-control" 
                      rows={5} 
                      placeholder="Redacta el mensaje del correo electrónico..."
                      style={{ resize: 'vertical', width: '100%', fontFamily: 'inherit', padding: '0.8rem' }}
                      value={bodyText} 
                      onChange={e => setBodyText(e.target.value)} 
                    />
                  </div>

                  <div>
                    <label className="input-label" style={{ marginBottom: '0.3rem', display: 'block', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <ImageIcon size={14} /> URL del Flyer / Imagen Promocional (Opcional)
                    </label>
                    <input 
                      type="text" 
                      className="input-control" 
                      placeholder="https://ejemplo.com/flyer-evento.jpg" 
                      value={imageUrl} 
                      onChange={e => setImageUrl(e.target.value)} 
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div>
                      <label className="input-label" style={{ marginBottom: '0.3rem', display: 'block' }}>Texto del Botón CTA</label>
                      <input 
                        type="text" 
                        className="input-control" 
                        value={ctaText} 
                        onChange={e => setCtaText(e.target.value)} 
                      />
                    </div>
                    <div>
                      <label className="input-label" style={{ marginBottom: '0.3rem', display: 'block' }}>Enlace del Botón CTA</label>
                      <input 
                        type="text" 
                        className="input-control" 
                        value={ctaLink} 
                        onChange={e => setCtaLink(e.target.value)} 
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'recipients' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.8rem' }}>
                    <h4 style={{ margin: 0 }}>Lista de Contactos Clientes</h4>
                    <button className="btn btn-ghost" onClick={handleSelectAll} style={{ fontSize: '0.8rem' }}>
                      {selectedClientes.length === clientes.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                    </button>
                  </div>

                  <div style={{ maxHeight: '50vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {clientes.map(c => (
                      <label 
                        key={c.id} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.8rem', 
                          padding: '0.75rem', 
                          borderRadius: '8px', 
                          background: selectedClientes.includes(c.email) ? 'rgba(255,255,255,0.05)' : 'transparent',
                          cursor: 'pointer',
                          border: '1px solid var(--border-color)'
                        }}
                      >
                        <input 
                          type="checkbox" 
                          checked={selectedClientes.includes(c.email)} 
                          onChange={() => handleToggleCliente(c.email)} 
                          disabled={!c.email}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{c.nombre}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.email || 'Sin correo registrado'}</span>
                        </div>
                      </label>
                    ))}
                    {clientes.length === 0 && (
                      <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No hay clientes registrados en el CRM.</p>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'preview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <h4 style={{ margin: 0 }}>Vista Previa en Tiempo Real (Versión Recipiente)</h4>
                  <div 
                    style={{ 
                      border: '1px solid var(--border-color)', 
                      borderRadius: '8px', 
                      background: '#fff', 
                      padding: '1rem', 
                      maxHeight: '60vh', 
                      overflowY: 'auto' 
                    }}
                    dangerouslySetInnerHTML={{ __html: compiledHtml }}
                  />
                </div>
              )}

            </div>

            {/* PANEL LATERAL DE CONTROL Y ENVÍO */}
            <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', height: 'fit-content' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Estado de Envío</h3>
              
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Destinatarios:</span>
                  <strong>{selectedClientes.length}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Asunto:</span>
                  <strong style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '120px' }}>{subject || 'Sin Asunto'}</strong>
                </div>
              </div>

              {isSending && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <span>Progreso:</span>
                    <span>{progress.current} / {progress.total}</span>
                  </div>
                  {/* Barra de Progreso */}
                  <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        height: '100%', 
                        background: 'var(--accent-secondary)', 
                        width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`,
                        transition: 'width 0.3s ease'
                      }} 
                    />
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                    Enviando a: {progress.email} ({progress.status})
                  </span>
                </div>
              )}

              {results && (
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>Resultados del Lote:</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-basil)', fontSize: '0.85rem' }}>
                    <Check size={16} /> {results.success.length} Enviados Correctamente
                  </div>
                  {results.failed.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-tomato)', fontSize: '0.85rem' }}>
                      <AlertCircle size={16} /> {results.failed.length} Errores de entrega
                    </div>
                  )}
                </div>
              )}

              <button 
                className="btn btn-primary" 
                onClick={handleSend} 
                disabled={isSending || selectedClientes.length === 0 || !subject}
                style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', height: '45px' }}
              >
                {isSending ? (
                  <>
                    <RefreshCw className="animate-spin" size={16} /> Procesando Lote...
                  </>
                ) : (
                  <>
                    <Send size={16} /> Iniciar Envío Masivo
                  </>
                )}
              </button>

              {sendingLogs.length > 0 && (
                <div>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Registro Histórico:</h4>
                  <div style={{ maxHeight: '150px', overflowY: 'auto', background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontFamily: 'monospace', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {sendingLogs.map((log, i) => (
                      <div key={i}>{log}</div>
                    ))}
                  </div>
                </div>
              )}

            </div>

          </div>

        </div>
      )}

    </div>
  );
};

export default MassEmailView;
