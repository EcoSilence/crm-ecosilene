import React, { useState, useRef, useEffect } from 'react';
import { Layout, Image as ImageIcon, Type, Sparkles, Paintbrush, AlignLeft, AlignCenter, AlignRight, UploadCloud, Trash2, Link } from 'lucide-react';

const CanvaEmailEditor = ({ data, onChange }) => {
  const [activeTab, setActiveTab] = useState('plantillas'); // 'plantillas' | 'elementos' | 'subidos'
  const [uploadedImages, setUploadedImages] = useState([
    { id: '1', url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500', name: 'Silent Party.jpg' },
    { id: '2', url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500', name: 'Concierto LED.jpg' }
  ]);
  const [dragOver, setDragOver] = useState(false);
  const [focusedElement, setFocusedElement] = useState(null); // 'bannerTitle' | 'heading' | 'bodyText' | 'ctaText'
  
  const fileInputRef = useRef(null);

  // Layout Previews
  const layouts = [
    {
      id: 'lanzamiento',
      name: 'Lanzamiento Visual',
      desc: 'Canva style, fondo oscuro, imagen héroe.',
      color: 'linear-gradient(135deg,#667eea,#764ba2)'
    },
    {
      id: 'catalogo',
      name: 'Catálogo Corporativo',
      desc: 'GoDaddy style, fondo claro, doble columna.',
      color: 'linear-gradient(135deg,#203a43,#2c5364)'
    },
    {
      id: 'informativo',
      name: 'Informativo Compacto',
      desc: 'Diseño elegante de reserva con viñetas.',
      color: 'linear-gradient(135deg,#1f4037,#99f2c8)'
    }
  ];

  // Elementos disponibles para insertar
  const presetTexts = [
    { label: 'Título Grande', text: '¡NUEVO LANZAMIENTO ECOSILENCE!', target: 'heading' },
    { label: 'Texto Descriptivo', text: 'Haz clic aquí para ingresar el mensaje principal de tu evento.', target: 'bodyText' },
    { label: 'Botón de Acción', text: 'Registrarse Ahora', target: 'ctaText' }
  ];

  // Manejar cambios en campos de forma segura
  const updateField = (field, value) => {
    onChange({ ...data, [field]: value });
  };

  // Manejar subida de imágenes (conversión a Base64)
  const handleFileUpload = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const newImg = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
          url: event.target.result,
          name: file.name
        };
        setUploadedImages(prev => [newImg, ...prev]);
        updateField('imageUrl', newImg.url); // Reemplazar la imagen actual
      };
      reader.readAsDataURL(file);
    });
  };

  const onDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const onDragLeave = () => {
    setDragOver(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileUpload({ target: { files } });
    }
  };

  return (
    <div 
      className="glass-card" 
      style={{ 
        display: 'flex', 
        minHeight: '650px', 
        borderRadius: '16px', 
        overflow: 'hidden', 
        background: 'var(--bg-dark)', 
        border: '1px solid var(--border-color)',
        padding: 0
      }}
    >
      
      {/* 1. BARRA LATERAL DE HERRAMIENTAS - ICONOS & PANELES */}
      <div 
        style={{ 
          width: '80px', 
          background: 'rgba(0,0,0,0.4)', 
          borderRight: '1px solid var(--border-color)', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          padding: '1.5rem 0', 
          gap: '1.5rem' 
        }}
      >
        <button 
          onClick={() => setActiveTab('plantillas')}
          style={{ 
            background: 'transparent', 
            border: 'none', 
            color: activeTab === 'plantillas' ? 'var(--accent-primary)' : 'var(--text-muted)',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.65rem'
          }}
        >
          <Layout size={24} /> Plantillas
        </button>
        
        <button 
          onClick={() => setActiveTab('elementos')}
          style={{ 
            background: 'transparent', 
            border: 'none', 
            color: activeTab === 'elementos' ? 'var(--accent-primary)' : 'var(--text-muted)',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.65rem'
          }}
        >
          <Type size={24} /> Elementos
        </button>

        <button 
          onClick={() => setActiveTab('subidos')}
          style={{ 
            background: 'transparent', 
            border: 'none', 
            color: activeTab === 'subidos' ? 'var(--accent-primary)' : 'var(--text-muted)',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.65rem'
          }}
        >
          <UploadCloud size={24} /> Subidos
        </button>
      </div>

      {/* PANEL DE DETALLE ACTIVO */}
      <div 
        style={{ 
          width: '260px', 
          background: 'rgba(0,0,0,0.2)', 
          borderRight: '1px solid var(--border-color)', 
          padding: '1.5rem', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '1.2rem',
          maxHeight: '750px',
          overflowY: 'auto'
        }}
      >
        {activeTab === 'plantillas' && (
          <>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 'bold' }}>Elige una Estructura</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {layouts.map(l => (
                <div 
                  key={l.id} 
                  onClick={() => {
                    updateField('templateDesign', l.id);
                    updateField('bannerGradient', l.color);
                  }}
                  style={{ 
                    padding: '1rem', 
                    borderRadius: '10px', 
                    background: data.templateDesign === l.id ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)',
                    border: '1px solid',
                    borderColor: data.templateDesign === l.id ? 'var(--accent-primary)' : 'var(--border-color)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <strong style={{ fontSize: '0.85rem', display: 'block' }}>{l.name}</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{l.desc}</span>
                  <div style={{ height: '8px', background: l.color, borderRadius: '4px', marginTop: '8px' }} />
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === 'elementos' && (
          <>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 'bold' }}>Insertar Textos</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {presetTexts.map((item, idx) => (
                <button 
                  key={idx} 
                  className="btn btn-ghost"
                  onClick={() => updateField(item.target, item.text)}
                  style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', padding: '0.8rem', borderRadius: '8px', gap: '0.2rem' }}
                >
                  <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{item.label}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '200px' }}>{item.text}</span>
                </button>
              ))}
            </div>

            <h4 style={{ margin: '1rem 0 0 0', fontSize: '0.95rem', fontWeight: 'bold' }}>Estilo de Banner</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label className="input-label" style={{ fontSize: '0.75rem' }}>Gradiente Fondo</label>
              <select 
                className="input-control" 
                value={data.bannerGradient} 
                onChange={e => updateField('bannerGradient', e.target.value)}
              >
                <option value="linear-gradient(135deg,#667eea,#764ba2)">Púrpura Canva</option>
                <option value="linear-gradient(135deg,#203a43,#2c5364)">Azul GoDaddy</option>
                <option value="linear-gradient(135deg,#1f4037,#99f2c8)">Verde EcoSilence</option>
                <option value="linear-gradient(135deg,#e74c3c,#c0392b)">Rojo Eventos</option>
              </select>
            </div>
          </>
        )}

        {activeTab === 'subidos' && (
          <>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 'bold' }}>Multimedia</h4>
            <div 
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{ 
                border: '2px dashed',
                borderColor: dragOver ? 'var(--accent-primary)' : 'var(--border-color)',
                borderRadius: '10px',
                padding: '1.5rem 1rem',
                textAlign: 'center',
                cursor: 'pointer',
                background: dragOver ? 'rgba(255,255,255,0.05)' : 'transparent',
                transition: 'all 0.2s'
              }}
            >
              <UploadCloud size={28} style={{ margin: '0 auto 8px auto', color: 'var(--text-muted)' }} />
              <span style={{ fontSize: '0.75rem', display: 'block', color: 'var(--text-muted)' }}>Arrastra imágenes aquí o haz clic para subir</span>
              <input 
                ref={fileInputRef} 
                type="file" 
                multiple 
                accept="image/*" 
                style={{ display: 'none' }} 
                onChange={handleFileUpload} 
              />
            </div>

            <h5 style={{ margin: '1rem 0 0 0', fontSize: '0.85rem' }}>Tus archivos subidos</h5>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
              {uploadedImages.map(img => (
                <div 
                  key={img.id}
                  style={{ position: 'relative', cursor: 'pointer', borderRadius: '6px', overflow: 'hidden', height: '80px', border: '1px solid var(--border-color)' }}
                  onClick={() => updateField('imageUrl', img.url)}
                >
                  <img src={img.url} alt={img.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setUploadedImages(uploadedImages.filter(x => x.id !== img.id));
                      if (data.imageUrl === img.url) updateField('imageUrl', '');
                    }}
                    style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '4px', color: '#ffaaaa', cursor: 'pointer', padding: '2px' }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* 2. LIENZO DE EDICIÓN EN TIEMPO REAL (EL CANVAS) */}
      <div 
        style={{ 
          flex: 1, 
          background: 'rgba(0,0,0,0.6)', 
          padding: '1.5rem', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '1rem',
          maxHeight: '750px',
          overflowY: 'auto'
        }}
      >
        
        {/* Barra de Control Estilo Canva Topbar */}
        <div 
          style={{ 
            background: 'var(--bg-panel)', 
            border: '1px solid var(--border-color)', 
            borderRadius: '8px', 
            padding: '0.6rem 1rem', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            fontSize: '0.8rem',
            color: 'var(--text-muted)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span>Edición: <strong>{data.templateDesign === 'lanzamiento' ? 'Lanzamiento' : data.templateDesign === 'catalogo' ? 'Catálogo' : 'Informativo'}</strong></span>
            {focusedElement && (
              <span style={{ color: 'var(--accent-primary)', fontSize: '0.75rem' }}>
                ✏️ Editando: {focusedElement === 'bannerTitle' ? 'Título Banner' : focusedElement === 'heading' ? 'Encabezado' : focusedElement === 'bodyText' ? 'Mensaje Principal' : 'Texto de Botón'}
              </span>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
            <button 
              className="btn btn-ghost" 
              onClick={() => updateField('bannerTitle', data.bannerTitle.toUpperCase())}
              title="Mayúsculas"
              style={{ padding: '4px 8px' }}
            >
              aA
            </button>
            <div style={{ display: 'flex', gap: '4px', borderLeft: '1px solid var(--border-color)', paddingLeft: '8px' }}>
              <button className="btn btn-ghost" style={{ padding: '4px' }} title="Alinear izquierda"><AlignLeft size={16} /></button>
              <button className="btn btn-ghost" style={{ padding: '4px' }} title="Alinear centro"><AlignCenter size={16} /></button>
              <button className="btn btn-ghost" style={{ padding: '4px' }} title="Alinear derecha"><AlignRight size={16} /></button>
            </div>
          </div>
        </div>

        {/* CONTENEDOR CENTRAL DEL LIENZO */}
        <div 
          style={{ 
            flex: 1, 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'flex-start',
            overflowY: 'auto',
            padding: '1rem 0'
          }}
        >
          
          {/* LIENZO REAL (MIMIC DE CORREO ELECTRONICO) */}
          <div 
            style={{ 
              width: '100%', 
              maxWidth: '560px', 
              borderRadius: '12px', 
              overflow: 'hidden', 
              background: data.templateDesign === 'lanzamiento' ? '#161625' : '#ffffff',
              boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
              border: '1px solid var(--border-color)',
              color: data.templateDesign === 'lanzamiento' ? '#ffffff' : '#2d3748',
              fontFamily: 'Arial, sans-serif',
              transition: 'all 0.3s'
            }}
          >
            
            {/* 1. Cabecera / Banner */}
            {data.templateDesign === 'catalogo' ? (
              <div style={{ padding: '15px 20px', borderBottom: '1px solid #edf2f7', display: 'flex', justifyContent: 'space-between', color: '#2d3748' }}>
                <strong style={{ fontSize: '16px' }}>ECOSILENCE</strong>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#718096' }}>Servicios</span>
              </div>
            ) : null}

            <div 
              style={{ 
                background: data.bannerGradient, 
                padding: '40px 20px', 
                textAlign: 'center',
                cursor: 'text',
                border: focusedElement === 'bannerTitle' ? '2px dashed var(--accent-primary)' : '2px solid transparent'
              }}
              onClick={() => setFocusedElement('bannerTitle')}
            >
              <h1 
                contentEditable={true}
                suppressContentEditableWarning={true}
                onBlur={(e) => updateField('bannerTitle', e.target.innerText)}
                style={{ 
                  color: '#ffffff', 
                  fontSize: '28px', 
                  margin: 0, 
                  fontWeight: 'bold', 
                  outline: 'none' 
                }}
              >
                {data.bannerTitle}
              </h1>
            </div>

            {/* 2. Cuerpo Principal */}
            <div style={{ padding: '30px 25px' }}>
              
              {/* Encabezado */}
              <div 
                style={{ 
                  cursor: 'text',
                  border: focusedElement === 'heading' ? '2px dashed var(--accent-primary)' : '2px solid transparent',
                  padding: '4px',
                  borderRadius: '4px',
                  marginBottom: '1rem'
                }}
                onClick={() => setFocusedElement('heading')}
              >
                <h2 
                  contentEditable={true}
                  suppressContentEditableWarning={true}
                  onBlur={(e) => updateField('heading', e.target.innerText)}
                  style={{ 
                    fontSize: '20px', 
                    margin: 0, 
                    fontWeight: 'bold', 
                    outline: 'none',
                    color: data.templateDesign === 'lanzamiento' ? '#ffffff' : '#1a202c'
                  }}
                >
                  {data.heading}
                </h2>
              </div>

              {/* Mensaje principal */}
              <div 
                style={{ 
                  cursor: 'text',
                  border: focusedElement === 'bodyText' ? '2px dashed var(--accent-primary)' : '2px solid transparent',
                  padding: '4px',
                  borderRadius: '4px',
                  marginBottom: '1.5rem'
                }}
                onClick={() => setFocusedElement('bodyText')}
              >
                <p 
                  contentEditable={true}
                  suppressContentEditableWarning={true}
                  onBlur={(e) => updateField('bodyText', e.target.innerText)}
                  style={{ 
                    fontSize: '14px', 
                    lineHeight: '1.6', 
                    margin: 0, 
                    outline: 'none',
                    color: data.templateDesign === 'lanzamiento' ? '#a0aec0' : '#4a5568'
                  }}
                >
                  {data.bodyText}
                </p>
              </div>

              {/* Contenedores por plantilla */}
              {data.templateDesign === 'informativo' && (
                <div style={{ background: '#f7fafc', border: '1px dashed #cbd5e0', padding: '15px', borderRadius: '6px', marginBottom: '20px', color: '#4a5568', fontSize: '13px' }}>
                  <strong style={{ display: 'block', color: '#2d3748', marginBottom: '6px' }}>🔑 CONDICIONES DE AGENDA</strong>
                  • Retiro gratuito en sucursales EcoSilence.<br />
                  • Sanitización exhaustiva certificada.<br />
                  • Garantía y servicio de asistencia.
                </div>
              )}

              {data.templateDesign === 'catalogo' && (
                <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                  <div style={{ flex: 1, background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #edf2f7', fontSize: '12px', color: '#718096' }}>
                    <strong style={{ color: '#2d3748', display: 'block', marginBottom: '4px' }}>🎧 Silent Disco</strong>
                    Transmisión en 3 canales con luces LED integradas.
                  </div>
                  <div style={{ flex: 1, background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #edf2f7', fontSize: '12px', color: '#718096' }}>
                    <strong style={{ color: '#2d3748', display: 'block', marginBottom: '4px' }}>🎙️ Conferencias</strong>
                    Audioguías profesionales con batería de larga duración.
                  </div>
                </div>
              )}

              {/* Imagen del Flyer */}
              {data.imageUrl ? (
                <div 
                  style={{ 
                    position: 'relative', 
                    textAlign: 'center', 
                    marginBottom: '20px',
                    borderRadius: '8px',
                    overflow: 'hidden'
                  }}
                >
                  <img src={data.imageUrl} alt="Flyer" style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px', display: 'block', margin: '0 auto' }} />
                  <div 
                    onClick={() => setActiveTab('subidos')}
                    style={{ 
                      position: 'absolute', 
                      inset: 0, 
                      background: 'rgba(0,0,0,0.6)', 
                      opacity: 0, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      color: '#fff', 
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      transition: 'opacity 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = 0}
                  >
                    <ImageIcon size={18} style={{ marginRight: '6px' }} /> Cambiar Imagen
                  </div>
                </div>
              ) : (
                <div 
                  onClick={() => setActiveTab('subidos')}
                  style={{ 
                    padding: '2rem 1rem', 
                    border: '1px dashed var(--border-color)', 
                    borderRadius: '8px', 
                    textAlign: 'center', 
                    color: 'var(--text-muted)', 
                    marginBottom: '20px',
                    cursor: 'pointer',
                    fontSize: '0.8rem'
                  }}
                >
                  <ImageIcon size={20} style={{ margin: '0 auto 6px auto' }} /> Añadir Flyer Promocional
                </div>
              )}

              {/* Botón CTA */}
              <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                <div 
                  style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center',
                    gap: '8px',
                    border: focusedElement === 'ctaText' ? '2px dashed var(--accent-primary)' : '2px solid transparent',
                    padding: '4px',
                    borderRadius: '4px'
                  }}
                >
                  <span 
                    contentEditable={true}
                    suppressContentEditableWarning={true}
                    onBlur={(e) => updateField('ctaText', e.target.innerText)}
                    onClick={() => setFocusedElement('ctaText')}
                    style={{ 
                      fontSize: '14px', 
                      fontWeight: 'bold', 
                      color: '#ffffff', 
                      background: '#2563eb', 
                      padding: '12px 24px', 
                      borderRadius: data.templateDesign === 'lanzamiento' ? '30px' : '4px',
                      display: 'inline-block',
                      outline: 'none',
                      cursor: 'text'
                    }}
                  >
                    {data.ctaText}
                  </span>
                  
                  {/* Edición de link del botón */}
                  <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px' }}>
                    <Link size={12} style={{ marginRight: '4px' }} />
                    <input 
                      type="text" 
                      value={data.ctaLink} 
                      onChange={e => updateField('ctaLink', e.target.value)}
                      style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '0.7rem', width: '120px', outline: 'none' }}
                      placeholder="URL de enlace"
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div style={{ padding: '20px 25px', background: data.templateDesign === 'lanzamiento' ? '#0f0f1b' : '#edf2f7', fontSize: '11px', textAlign: 'center', borderTop: '1px solid var(--border-color)', color: '#718096' }}>
              <strong>EcoSilence CRM</strong> — Soluciones de Audio Silencioso<br />
              Recibiste este correo debido a tu suscripción comercial. <a href="#" style={{ color: '#2563eb' }}>Desuscribirse</a>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};

export default CanvaEmailEditor;
