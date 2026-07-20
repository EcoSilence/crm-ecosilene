import React, { useState, useMemo } from 'react';
import { useAppStore } from '../context/AppDataContext';
import { useToast } from '../context/ToastContext';
import { sendMassEmailsInBatches } from '../services/GoogleMailService';
import { Mail, Users, Check, AlertCircle, RefreshCw, Send, Image as ImageIcon, Layout, Eye, HelpCircle } from 'lucide-react';
import CanvaEmailEditor from './CanvaEmailEditor';

const MassEmailView = () => {
  const { clientes, isGoogleLinked, linkGoogle, viewParams, setViewParams } = useAppStore();
  const { addToast } = useToast();

  // Estados de Formulario
  const [subject, setSubject] = useState('');
  const [selectedClientes, setSelectedClientes] = useState([]);

  React.useEffect(() => {
    if (viewParams && viewParams.preselectedEmails) {
      setSelectedClientes(viewParams.preselectedEmails);
      setViewParams(null);
    }
  }, [viewParams, setViewParams]);
  
  // Editor del Template de Correo
  const [bannerTitle, setBannerTitle] = useState('Novedades de EcoSilence');
  const [bannerGradient, setBannerGradient] = useState('linear-gradient(135deg,#667eea,#764ba2)');
  const [heading, setHeading] = useState('¡Conoce nuestra experiencia acústica!');
  const [bodyText, setBodyText] = useState('Te invitamos a descubrir cómo nuestras soluciones de sonido y eventos silenciosos transforman la experiencia de tus clientes.');
  const [preheader, setPreheader] = useState('Descubre las novedades y sonido inmersivo de EcoSilence.');
  const [subtitle, setSubtitle] = useState('Soluciones inmersivas de sonido inalámbrico para eventos.');
  const [ctaRadius, setCtaRadius] = useState('4px');
  const [ctaBg, setCtaBg] = useState('#2563eb');
  const [imageUrl, setImageUrl] = useState('');
  const [ctaText, setCtaText] = useState('Visitar EcoSilence');
  const [ctaLink, setCtaLink] = useState('https://ecosilence.cl');
  const [templateDesign, setTemplateDesign] = useState('lanzamiento');
  const [col1Title, setCol1Title] = useState('🎧 Silent Disco');
  const [col1Text, setCol1Text] = useState('Transmisión en 3 canales con luces LED integradas.');
  const [col2Title, setCol2Title] = useState('🎙️ Conferencias');
  const [col2Text, setCol2Text] = useState('Audioguías profesionales con batería de larga duración.');
  const [infoTitle, setInfoTitle] = useState('🔑 CONDICIONES DE AGENDA');
  const [infoText, setInfoText] = useState('• Retiro gratuito en sucursales EcoSilence.\n• Sanitización exhaustiva certificada.\n• Garantía y servicio de asistencia.');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [blockOrder, setBlockOrder] = useState(['heading_block', 'body_block', 'grid_block', 'conditions_block', 'image_block', 'cta_block']);
  const [styles, setStyles] = useState({
    bannerTitle: { fontFamily: 'Arial', fontSize: 28, color: '#ffffff', bold: true, italic: false, underline: false, align: 'center' },
    heading: { fontFamily: 'Arial', fontSize: 20, color: '#ffffff', bold: true, italic: false, underline: false, align: 'center' },
    subtitle: { fontFamily: 'Arial', fontSize: 16, color: '#a0aec0', bold: false, italic: true, underline: false, align: 'center' },
    bodyText: { fontFamily: 'Arial', fontSize: 14, color: '#a0aec0', bold: false, italic: false, underline: false, align: 'center' },
    ctaText: { fontFamily: 'Arial', fontSize: 14, color: '#ffffff', bold: true, italic: false, underline: false, align: 'center' }
  });

  const [backgroundColor, setBackgroundColor] = useState('');
  const [backgroundImageUrl, setBackgroundImageUrl] = useState('');
  const [backgroundImageOpacity, setBackgroundImageOpacity] = useState(20);

  // Estados de Envío y Progreso
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, email: '', status: '' });
  const [results, setResults] = useState(null);
  const [sendingLogs, setSendingLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('compose'); // 'compose' | 'recipients' | 'preview'

  const compiledHtml = useMemo(() => {
    const bannerStyle = `background: ${bannerGradient};`;
    const imageTag = imageUrl 
      ? `<img src="${imageUrl}" alt="Flyer del Evento" width="540" style="display:block;max-width:100%;height:auto;border-radius:8px;border:0;margin:0 auto;" />`
      : '';

    const bgOpacity = (backgroundImageOpacity !== undefined ? backgroundImageOpacity : 20) / 100;
    const isDark = templateDesign === 'lanzamiento';
    const bgBaseColor = backgroundColor || (isDark ? '#161625' : '#ffffff');
    
    let rgbOverlay = isDark ? '22,22,37' : '255,255,255';
    if (backgroundColor) {
      const hex = backgroundColor.replace('#', '');
      if (hex.length === 6) {
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        rgbOverlay = `${r},${g},${b}`;
      }
    }

    const containerBgStyle = backgroundImageUrl
      ? `background: linear-gradient(rgba(${rgbOverlay}, ${1 - bgOpacity}), rgba(${rgbOverlay}, ${1 - bgOpacity})), url('${backgroundImageUrl}') center/cover no-repeat; background-color: ${bgBaseColor};`
      : `background-color: ${bgBaseColor};`;

    const infoRowsHtml = (infoText || '')
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const cleanLine = line.replace(/^[•\-\*✔️\s\t]+/, '').trim();
        return `<tr>
                  <td width="30" valign="top">✔️</td>
                  <td style="padding-bottom:8px;">${cleanLine}</td>
                </tr>`;
      })
      .join('');

    const getInlineStyle = (element) => {
      const s = styles[element] || {};
      const font = s.fontFamily || 'Arial';
      const size = s.fontSize || (element === 'bannerTitle' ? 28 : element === 'heading' ? 20 : element === 'subtitle' ? 16 : 14);
      
      let color = s.color || 'inherit';
      if (templateDesign !== 'lanzamiento') {
        if (element === 'heading' && color === '#ffffff') color = '#1a202c';
        if (element === 'subtitle' && color === '#a0aec0') color = '#718096';
        if (element === 'bodyText' && color === '#a0aec0') color = '#4a5568';
      }
      
      const boldStyle = s.bold ? 'bold' : 'normal';
      const italicStyle = s.italic ? 'italic' : 'normal';
      const underlineStyle = s.underline ? 'underline' : 'none';
      const alignStyle = s.align || 'center';
      return `font-family:${font}, sans-serif; font-size:${size}px; color:${color}; font-weight:${boldStyle}; font-style:${italicStyle}; text-decoration:${underlineStyle}; text-align:${alignStyle};`;
    };

    const renderBlock = (blockId) => {
      if (blockId === 'heading_block') {
        return `<!-- Encabezado -->
          <tr>
            <td style="padding:25px 30px 10px 30px;">
              <h2 style="${getInlineStyle('heading')} margin:0 0 8px; line-height:1.3;">${heading}</h2>
              <h3 style="${getInlineStyle('subtitle')} margin:0 0 20px; line-height:1.4;">${subtitle}</h3>
            </td>
          </tr>`;
      }
      if (blockId === 'body_block') {
        return `<!-- Cuerpo del Mensaje -->
          <tr>
            <td style="padding:0 30px 20px 30px;">
              <p style="${getInlineStyle('bodyText')} line-height:1.6; margin:0 0 20px;">${bodyText.replace(/\n/g, '<br />')}</p>
            </td>
          </tr>`;
      }
      if (blockId === 'image_block') {
        return imageUrl ? `<!-- Imagen del Flyer -->
          <tr>
            <td align="center" style="padding:0 30px 25px 30px;">
              ${imageTag}
            </td>
          </tr>` : '';
      }
      if (blockId === 'cta_block') {
        return `<!-- CTA -->
          <tr>
            <td align="center" style="padding:0 30px 35px 30px;">
              <table cellpadding="0" cellspacing="0" border="0" align="center">
                <tr>
                  <td align="center" bgcolor="${ctaBg || '#2563eb'}" style="border-radius:${ctaRadius || '8px'};overflow:hidden;">
                    <a href="${ctaLink}" target="_blank" style="${getInlineStyle('ctaText')} text-decoration:none; padding:12px 28px; display:inline-block; font-weight:bold; letter-spacing:0.5px;">
                      ${ctaText}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;
      }
      if (blockId === 'grid_block' && templateDesign === 'catalogo') {
        return `<!-- Cuadrícula 2 Columnas -->
          <tr>
            <td style="padding:0 30px 30px 30px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <!-- Columna 1 -->
                  <td width="260" valign="top" style="background-color:#f8fafc;padding:15px;border-radius:6px;border:1px solid #edf2f7;">
                    ${imageUrl ? `<div style="text-align:center;margin-bottom:12px;">${imageTag}</div>` : ''}
                    <h3 style="${getInlineStyle('col1Title')} font-size:16px;margin:0 0 8px;font-weight:bold;">${col1Title}</h3>
                    <p style="${getInlineStyle('col1Text')} font-size:13px;margin:0;line-height:1.4;">${col1Text.replace(/\n/g, '<br />')}</p>
                  </td>
                  <!-- Separador -->
                  <td width="20">&nbsp;</td>
                  <!-- Columna 2 -->
                  <td width="260" valign="top" style="background-color:#f8fafc;padding:15px;border-radius:6px;border:1px solid #edf2f7;">
                    <div style="background-color:#2563eb;color:#ffffff;font-size:11px;font-weight:bold;padding:3px 8px;border-radius:12px;display:inline-block;margin-bottom:12px;text-transform:uppercase;">Destacado</div>
                    <h3 style="${getInlineStyle('col2Title')} font-size:16px;margin:0 0 8px;font-weight:bold;">${col2Title}</h3>
                    <p style="${getInlineStyle('col2Text')} font-size:13px;margin:0;line-height:1.4;">${col2Text.replace(/\n/g, '<br />')}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;
      }
      if (blockId === 'conditions_block' && templateDesign === 'informativo') {
        return `<!-- Recuadro Detalle Destacado -->
          <tr>
            <td style="padding:0 30px 24px 30px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#f7fafc" style="border:1px dashed #cbd5e0;border-radius:6px;">
                <tr>
                  <td style="padding:20px;">
                    <h4 style="${getInlineStyle('infoTitle')} margin:0 0 10px 0;font-size:14px;text-transform:uppercase;letter-spacing:0.5px;font-weight:bold;">${infoTitle}</h4>
                    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="font-size:13px;color:#4a5568;line-height:1.6;">
                      ${infoRowsHtml}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;
      }
      return '';
    };

    const activeBlocks = (blockOrder || ['heading_block', 'body_block', 'grid_block', 'conditions_block', 'image_block', 'cta_block']).filter(b => {
      if (b === 'grid_block') return templateDesign === 'catalogo';
      if (b === 'conditions_block') return templateDesign === 'informativo';
      return true;
    });

    const renderedBlocksHtml = activeBlocks.map(renderBlock).join('\n');

    // Plantilla 1: Lanzamiento / Experiencia Visual (Estilo Canva Minimalista - Oscuro)
    if (templateDesign === 'lanzamiento') {
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject || 'EcoSilence Newsletter'}</title>
</head>
<body style="margin:0;padding:0;background-color:#1a1a2e;font-family:Arial,sans-serif;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#1a1a2e">
    <tr>
      <td align="center" style="padding:40px 10px;">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="${containerBgStyle}border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.3);">
          <tr>
            <td align="center" style="${bannerStyle}padding:50px 20px;text-align:center;">
              <h1 style="${getInlineStyle('bannerTitle')} margin:0; letter-spacing:1px; text-transform:uppercase; text-shadow:0 2px 4px rgba(0,0,0,0.2);">${bannerTitle}</h1>
            </td>
          </tr>
          ${renderedBlocksHtml}
          <tr>
            <td align="center" style="padding:30px;background-color:#0f0f1b;font-size:12px;color:#718096;text-align:center;border-top:1px solid rgba(255,255,255,0.05);">
              <p style="margin:0 0 8px 0;"><strong>EcoSilence CRM</strong> — Premium Silent Experiences</p>
              <p style="margin:0;">Recibiste este correo porque estás registrado en nuestra base de datos. <a href="#" style="color:#2563eb;text-decoration:underline;">Anular suscripción</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
    }

    // Plantilla 2: Catálogo Técnico / Corporativo (Estilo GoDaddy - Claro)
    if (templateDesign === 'catalogo') {
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject || 'EcoSilence Newsletter'}</title>
</head>
<body style="margin:0;padding:0;background-color:#f7fafc;font-family:Arial,sans-serif;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#f7fafc">
    <tr>
      <td align="center" style="padding:30px 10px;">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="${containerBgStyle}border-radius:8px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05);border:1px solid #e2e8f0;">
          <tr>
            <td style="${bannerStyle}padding:40px 30px;color:#ffffff;">
              <h1 style="${getInlineStyle('bannerTitle')} margin:0; text-shadow:0 1px 3px rgba(0,0,0,0.15);">${bannerTitle}</h1>
            </td>
          </tr>
          ${renderedBlocksHtml}
          <tr>
            <td align="center" style="padding:25px 30px;background-color:#f7fafc;font-size:11px;color:#a0aec0;text-align:center;">
              <p style="margin:0 0 4px 0;text-transform:uppercase;letter-spacing:1px;font-weight:bold;color:#718096;">EcoSilence Chile</p>
              <p style="margin:0 0 12px 0;">Santiago de Chile — Soluciones de Aislamiento Acústico y Eventos</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
    }

    // Plantilla 3: Informativo / Reserva y Agenda (Elegante y Compacto)
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject || 'EcoSilence Newsletter'}</title>
</head>
<body style="margin:0;padding:0;background-color:#edf2f7;font-family:Arial,sans-serif;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#edf2f7">
    <tr>
      <td align="center" style="padding:40px 10px;">
        <table cellpadding="0" cellspacing="0" border="0" width="550" style="${containerBgStyle}border-radius:10px;overflow:hidden;box-shadow:0 4px 15 rgba(0,0,0,0.05);">
          <tr>
            <td height="6" style="${bannerStyle}"></td>
          </tr>
          <tr>
            <td align="center" style="padding:30px 20px 20px 20px;border-bottom:1px solid #edf2f7;">
              <h1 style="${getInlineStyle('bannerTitle')} margin:0; letter-spacing:0.5px;">${bannerTitle}</h1>
            </td>
          </tr>
          ${renderedBlocksHtml}
          <tr>
            <td align="center" style="padding:20px;background-color:#f7fafc;font-size:11px;color:#718096;text-align:center;border-top:1px solid #edf2f7;">
              <p style="margin:0;">EcoSilence CRM — Soporte al Cliente: contacto@ecosilence.cl</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }, [bannerTitle, bannerGradient, heading, bodyText, imageUrl, ctaText, ctaLink, subject, templateDesign, styles, backgroundColor, backgroundImageUrl, backgroundImageOpacity, preheader, subtitle, ctaRadius, ctaBg, col1Title, col1Text, col2Title, col2Text, infoTitle, infoText, blockOrder]);

  const editorData = {
    subject,
    preheader,
    subtitle,
    ctaRadius,
    ctaBg,
    bannerTitle,
    bannerGradient,
    heading,
    bodyText,
    imageUrl,
    ctaText,
    ctaLink,
    templateDesign,
    styles,
    backgroundColor,
    backgroundImageUrl,
    backgroundImageOpacity,
    col1Title,
    col1Text,
    col2Title,
    col2Text,
    infoTitle,
    infoText,
    blockOrder
  };

  const handleEditorChange = (newData) => {
    if (newData.subject !== undefined) setSubject(newData.subject);
    if (newData.preheader !== undefined) setPreheader(newData.preheader);
    if (newData.subtitle !== undefined) setSubtitle(newData.subtitle);
    if (newData.ctaRadius !== undefined) setCtaRadius(newData.ctaRadius);
    if (newData.ctaBg !== undefined) setCtaBg(newData.ctaBg);
    if (newData.bannerTitle !== undefined) setBannerTitle(newData.bannerTitle);
    if (newData.bannerGradient !== undefined) setBannerGradient(newData.bannerGradient);
    if (newData.heading !== undefined) setHeading(newData.heading);
    if (newData.bodyText !== undefined) setBodyText(newData.bodyText);
    if (newData.imageUrl !== undefined) setImageUrl(newData.imageUrl);
    if (newData.ctaText !== undefined) setCtaText(newData.ctaText);
    if (newData.ctaLink !== undefined) setCtaLink(newData.ctaLink);
    if (newData.templateDesign !== undefined) setTemplateDesign(newData.templateDesign);
    if (newData.styles !== undefined) setStyles(newData.styles);
    if (newData.backgroundColor !== undefined) setBackgroundColor(newData.backgroundColor);
    if (newData.backgroundImageUrl !== undefined) setBackgroundImageUrl(newData.backgroundImageUrl);
    if (newData.backgroundImageOpacity !== undefined) setBackgroundImageOpacity(newData.backgroundImageOpacity);
    if (newData.col1Title !== undefined) setCol1Title(newData.col1Title);
    if (newData.col1Text !== undefined) setCol1Text(newData.col1Text);
    if (newData.col2Title !== undefined) setCol2Title(newData.col2Title);
    if (newData.col2Text !== undefined) setCol2Text(newData.col2Text);
    if (newData.infoTitle !== undefined) setInfoTitle(newData.infoTitle);
    if (newData.infoText !== undefined) setInfoText(newData.infoText);
    if (newData.blockOrder !== undefined) setBlockOrder(newData.blockOrder);
  };

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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', gap: '1rem', paddingBottom: '0.2rem' }}>
            <div style={{ display: 'flex', gap: '1rem' }}>
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
            
            <button 
              className="btn btn-ghost" 
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              style={{ fontSize: '0.8rem', display: 'flex', gap: '0.4rem', alignItems: 'center', padding: '0.4rem 0.8rem' }}
            >
              {isSidebarCollapsed ? 'Mostrar Estado 📥' : 'Ocultar Estado 📭'}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isSidebarCollapsed ? '1fr' : '2fr 1.1fr', gap: '1.5rem', transition: 'all 0.3s' }}>
            
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
                  
                  <CanvaEmailEditor data={editorData} onChange={handleEditorChange} />
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
            {!isSidebarCollapsed && (
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
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MassEmailView;
