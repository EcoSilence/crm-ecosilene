import React, { useState, useRef } from 'react';
import { Layout, Image as ImageIcon, Type, UploadCloud, Trash2, Link, Search, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify, Plus, Minus, Sparkles } from 'lucide-react';
import { emailTemplates } from '../data/emailTemplatesData';
import { generateDesignFromPrompt } from '../services/aiDesignGenerator';

const CanvaEmailEditor = ({ data, onChange }) => {
  const [activeTab, setActiveTab] = useState('plantillas'); // 'plantillas' | 'elementos' | 'subidos'
  const [searchTerm, setSearchTerm] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadedImages, setUploadedImages] = useState([
    { id: '1', url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500', name: 'Silent Party.jpg' },
    { id: '2', url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500', name: 'Concierto LED.jpg' }
  ]);
  const [dragOver, setDragOver] = useState(false);
  const [focusedElement, setFocusedElement] = useState(null); // 'bannerTitle' | 'heading' | 'bodyText' | 'ctaText'
  
  const fileInputRef = useRef(null);

  // Paleta de Colores Preestablecida para Email Marketing
  const colorPalette = [
    '#ffffff', '#a0aec0', '#4a5568', '#1a202c', // Grises / Blanco / Negro
    '#667eea', '#764ba2', '#2563eb', '#1d4ed8', // Azules / Púrpuras
    '#1f4037', '#38ef7d', '#10b981', '#059669', // Verdes
    '#ff9966', '#ff5e62', '#e74c3c', '#c0392b'  // Rojos / Naranjas
  ];

  // Default font styling if not defined in props
  const defaultStyles = {
    bannerTitle: { fontFamily: 'Arial', fontSize: 28, color: '#ffffff', bold: true, italic: false, underline: false, align: 'center' },
    heading: { fontFamily: 'Arial', fontSize: 20, color: '#ffffff', bold: true, italic: false, underline: false, align: 'center' },
    bodyText: { fontFamily: 'Arial', fontSize: 14, color: '#a0aec0', bold: false, italic: false, underline: false, align: 'center' },
    ctaText: { fontFamily: 'Arial', fontSize: 14, color: '#ffffff', bold: true, italic: false, underline: false, align: 'center' }
  };

  const activeStyles = data.styles || defaultStyles;

  const updateStyleField = (element, key, value) => {
    const updatedStyles = {
      ...activeStyles,
      [element]: {
        ...activeStyles[element],
        [key]: value
      }
    };
    onChange({ ...data, styles: updatedStyles });
  };

  const getStyleObj = (element) => {
    const styleData = activeStyles[element] || defaultStyles[element];
    return {
      fontFamily: styleData.fontFamily || 'Arial, sans-serif',
      fontSize: `${styleData.fontSize || 14}px`,
      color: styleData.color || 'inherit',
      fontWeight: styleData.bold ? 'bold' : 'normal',
      fontStyle: styleData.italic ? 'italic' : 'normal',
      textDecoration: styleData.underline ? 'underline' : 'none',
      textAlign: styleData.align || 'center'
    };
  };

  // Filtrado de Plantillas Estáticas por Buscador
  const filteredTemplates = emailTemplates.filter(tpl => {
    const term = searchTerm.toLowerCase();
    return (
      tpl.name.toLowerCase().includes(term) ||
      tpl.category.toLowerCase().includes(term) ||
      tpl.tags.some(tag => tag.toLowerCase().includes(term))
    );
  });

  const loadTemplate = (tpl) => {
    onChange({
      ...data,
      bannerTitle: tpl.bannerTitle,
      bannerGradient: tpl.bannerGradient,
      heading: tpl.heading,
      bodyText: tpl.bodyText,
      ctaText: tpl.ctaText,
      ctaLink: tpl.ctaLink,
      templateDesign: tpl.templateDesign,
      imageUrl: tpl.imageUrl
    });
  };

  const handleAIGenerate = () => {
    if (!searchTerm.trim()) return;
    setIsGenerating(true);
    setTimeout(() => {
      const result = generateDesignFromPrompt(searchTerm);
      onChange({
        ...data,
        ...result
      });
      setIsGenerating(false);
    }, 1000); // 1-second dynamic transition delay for premium feeling
  };

  const updateField = (field, value) => {
    onChange({ ...data, [field]: value });
  };

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
        updateField('imageUrl', newImg.url);
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

  const bgOpacity = (data.backgroundImageOpacity !== undefined ? data.backgroundImageOpacity : 20) / 100;
  const isDarkCanvas = data.templateDesign === 'lanzamiento';
  const bgBaseColor = data.backgroundColor || (isDarkCanvas ? '#161625' : '#ffffff');
  
  let rgbOverlay = isDarkCanvas ? '22,22,37' : '255,255,255';
  if (data.backgroundColor) {
    const hex = data.backgroundColor.replace('#', '');
    if (hex.length === 6) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      rgbOverlay = `${r},${g},${b}`;
    }
  }

  const canvasBackgroundStyle = data.backgroundImageUrl
    ? `linear-gradient(rgba(${rgbOverlay}, ${1 - bgOpacity}), rgba(${rgbOverlay}, ${1 - bgOpacity})), url('${data.backgroundImageUrl}') center/cover no-repeat`
    : bgBaseColor;

  return (
    <div 
      className="glass-card" 
      style={{ 
        display: 'flex', 
        minHeight: '700px', 
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
          width: '280px', 
          background: 'rgba(0,0,0,0.2)', 
          borderRight: '1px solid var(--border-color)', 
          padding: '1.2rem', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '1.2rem',
          maxHeight: '750px',
          overflowY: 'auto'
        }}
      >
        {activeTab === 'plantillas' && (
          <>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 'bold' }}>Generador con IA</h4>
            
            {/* Buscador Inteligente con Prompt de IA */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div style={{ position: 'relative' }}>
                <textarea 
                  className="input-control" 
                  rows={3}
                  placeholder="Describe el diseño... (ej: 'Necesito un mail elegante para anunciar aumento de stock de audífonos')" 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{ paddingLeft: '2.2rem', fontSize: '0.8rem', resize: 'vertical', width: '100%', fontFamily: 'inherit', paddingRight: '0.8rem' }}
                />
                <Sparkles size={16} style={{ position: 'absolute', left: '0.8rem', top: '12px', color: 'var(--accent-primary)' }} />
              </div>
              <button 
                className="btn btn-primary" 
                onClick={handleAIGenerate}
                disabled={isGenerating || !searchTerm.trim()}
                style={{ width: '100%', fontSize: '0.8rem', height: '35px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
              >
                <Sparkles size={14} /> Generar Diseño con IA
              </button>
            </div>

            {/* Sugerencias de IA */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>Sugerencias de Prompts:</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {[
                  "Anuncio de stock de audífonos 3 canales en Santiago",
                  "Instructivo paso a paso de cómo agendar servicio",
                  "Promoción de cine al aire libre en Valparaíso",
                  "Clase de yoga y meditación outdoor"
                ].map((promptText, i) => (
                  <button 
                    key={i}
                    onClick={() => {
                      setSearchTerm(promptText);
                      setIsGenerating(true);
                      setTimeout(() => {
                        const result = generateDesignFromPrompt(promptText);
                        onChange({ ...data, ...result });
                        setIsGenerating(false);
                      }, 1000);
                    }}
                    style={{ 
                      background: 'rgba(255,255,255,0.02)', 
                      border: '1px solid var(--border-color)', 
                      borderRadius: '6px', 
                      padding: '6px 10px', 
                      fontSize: '0.7rem', 
                      color: 'var(--text-muted)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      width: '100%',
                      outline: 'none'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.color = '#fff'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                  >
                    💡 "{promptText}"
                  </button>
                ))}
              </div>
            </div>

            <h5 style={{ margin: '1rem 0 0 0', fontSize: '0.8rem', fontWeight: 'bold', borderTop: '1px solid var(--border-color)', paddingTop: '0.8rem' }}>Resultados de Biblioteca</h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {filteredTemplates.slice(0, 5).map(tpl => (
                <div 
                  key={tpl.id} 
                  onClick={() => loadTemplate(tpl)}
                  style={{ 
                    padding: '0.8rem', 
                    borderRadius: '10px', 
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border-color)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    position: 'relative'
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                >
                  <strong style={{ fontSize: '0.8rem', display: 'block', marginBottom: '2px' }}>{tpl.name}</strong>
                  <span style={{ 
                    fontSize: '0.65rem', 
                    padding: '2px 6px', 
                    borderRadius: '4px', 
                    background: tpl.category === 'stock' ? 'rgba(37,99,235,0.2)' : tpl.category === 'proceso' ? 'rgba(16,185,129,0.2)' : 'rgba(139,92,246,0.2)',
                    color: tpl.category === 'stock' ? '#60a5fa' : tpl.category === 'proceso' ? '#34d399' : '#c084fc',
                    display: 'inline-block' 
                  }}>
                    {tpl.category === 'stock' ? 'Nuevos Equipos' : tpl.category === 'proceso' ? 'Proceso / Reserva' : 'Temporada / Cine'}
                  </span>
                  <div style={{ height: '4px', background: tpl.bannerGradient, borderRadius: '2px', marginTop: '6px' }} />
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === 'elementos' && (
          <>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 'bold' }}>Insertar Textos</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <button 
                className="btn btn-ghost"
                onClick={() => updateField('heading', '¡NUEVO LANZAMIENTO ECOSILENCE!')}
                style={{ textAlign: 'left', padding: '0.8rem' }}
              >
                <strong style={{ fontSize: '0.8rem', display: 'block' }}>Título Grande</strong>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Haz clic para inyectar</span>
              </button>
              <button 
                className="btn btn-ghost"
                onClick={() => updateField('bodyText', 'Haz clic aquí para ingresar el mensaje principal de tu evento.')}
                style={{ textAlign: 'left', padding: '0.8rem' }}
              >
                <strong style={{ fontSize: '0.8rem', display: 'block' }}>Texto Descriptivo</strong>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Haz clic para inyectar</span>
              </button>
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

            <h4 style={{ margin: '1.2rem 0 0 0', fontSize: '0.95rem', fontWeight: 'bold', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>Fondo de Correo</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label className="input-label" style={{ fontSize: '0.75rem' }}>Color de Fondo</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {['#ffffff', '#f7fafc', '#edf2f7', '#161625', '#0f0f1b', '#1a202c'].map((col) => (
                  <button 
                    key={col}
                    onClick={() => updateField('backgroundColor', col)}
                    style={{ 
                      width: '24px', 
                      height: '24px', 
                      borderRadius: '4px', 
                      background: col, 
                      border: data.backgroundColor === col ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                      cursor: 'pointer' 
                    }}
                    title={col}
                  />
                ))}
                <input 
                  type="color" 
                  value={data.backgroundColor || (data.templateDesign === 'lanzamiento' ? '#161625' : '#ffffff')}
                  onChange={e => updateField('backgroundColor', e.target.value)}
                  style={{ width: '24px', height: '24px', padding: 0, border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', background: 'transparent' }}
                  title="Color personalizado"
                />
              </div>
            </div>

            {data.backgroundImageUrl && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                <label className="input-label" style={{ fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Opacidad de Fondo</span>
                  <span>{data.backgroundImageOpacity !== undefined ? data.backgroundImageOpacity : 20}%</span>
                </label>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={data.backgroundImageOpacity !== undefined ? data.backgroundImageOpacity : 20}
                  onChange={e => updateField('backgroundImageOpacity', parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
                />
                
                <button 
                  className="btn btn-ghost"
                  onClick={() => {
                    updateField('backgroundImageUrl', '');
                    updateField('backgroundColor', '');
                  }}
                  style={{ fontSize: '0.7rem', color: '#ff8888', marginTop: '0.2rem', padding: '4px 8px' }}
                >
                  Restablecer Fondo Original
                </button>
              </div>
            )}
            
            <h4 style={{ margin: '1.2rem 0 0 0', fontSize: '0.95rem', fontWeight: 'bold', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>Enlace del Botón</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '0.5rem', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '6px 10px' }}>
              <Link size={14} style={{ color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                value={data.ctaLink || ''} 
                onChange={e => updateField('ctaLink', e.target.value)}
                style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '0.8rem', outline: 'none', padding: 0, width: '100%' }}
                placeholder="https://ecosilence.cl"
              />
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
                border: '2px dashed var(--border-color)',
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
                  style={{ position: 'relative', borderRadius: '6px', overflow: 'hidden', height: '110px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.2)' }}
                >
                  <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                    <img src={img.url} alt={img.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ display: 'flex', background: 'rgba(0,0,0,0.7)', padding: '4px', gap: '4px', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button 
                      onClick={() => updateField('imageUrl', img.url)}
                      title="Usar como Flyer"
                      style={{ background: data.imageUrl === img.url ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '3px', color: '#fff', fontSize: '9px', padding: '2px 4px', cursor: 'pointer' }}
                    >
                      Flyer
                    </button>
                    <button 
                      onClick={() => updateField('backgroundImageUrl', img.url)}
                      title="Usar como Fondo"
                      style={{ background: data.backgroundImageUrl === img.url ? 'var(--accent-secondary)' : 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '3px', color: '#fff', fontSize: '9px', padding: '2px 4px', cursor: 'pointer' }}
                    >
                      Fondo
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setUploadedImages(uploadedImages.filter(x => x.id !== img.id));
                        if (data.imageUrl === img.url) updateField('imageUrl', '');
                        if (data.backgroundImageUrl === img.url) updateField('backgroundImageUrl', '');
                      }}
                      title="Eliminar"
                      style={{ background: 'transparent', border: 'none', color: '#ffaaaa', cursor: 'pointer', padding: '2px' }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
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
        
        {/* BARRA DE EDICIÓN FLOTANTE SUPERIOR ESTILO CANVA */}
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
            color: 'var(--text-muted)',
            gap: '1rem',
            flexWrap: 'wrap'
          }}
        >
          {focusedElement ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap', width: '100%' }}>
              
              {/* Selector de Fuentes */}
              <select
                value={(activeStyles[focusedElement] || {}).fontFamily || 'Arial'}
                onChange={e => updateStyleField(focusedElement, 'fontFamily', e.target.value)}
                style={{ 
                  background: 'rgba(255,255,255,0.05)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '4px', 
                  color: '#fff', 
                  padding: '4px 8px',
                  fontSize: '0.75rem',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="Arial" style={{ color: '#000' }}>Arial</option>
                <option value="Helvetica" style={{ color: '#000' }}>Helvetica</option>
                <option value="Times New Roman" style={{ color: '#000' }}>Times New Roman</option>
                <option value="Georgia" style={{ color: '#000' }}>Georgia</option>
                <option value="Tahoma" style={{ color: '#000' }}>Tahoma</option>
                <option value="Verdana" style={{ color: '#000' }}>Verdana</option>
              </select>

              {/* Selector de Tamaño Numérico */}
              <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                <button 
                  onClick={() => {
                    const currentSize = (activeStyles[focusedElement] || {}).fontSize || 14;
                    updateStyleField(focusedElement, 'fontSize', Math.max(8, currentSize - 1));
                  }}
                  style={{ background: 'transparent', border: 'none', color: '#fff', padding: '4px 8px', cursor: 'pointer' }}
                >
                  <Minus size={12} />
                </button>
                <span style={{ fontSize: '0.75rem', width: '24px', textAlign: 'center', color: '#fff' }}>
                  {(activeStyles[focusedElement] || {}).fontSize || 14}
                </span>
                <button 
                  onClick={() => {
                    const currentSize = (activeStyles[focusedElement] || {}).fontSize || 14;
                    updateStyleField(focusedElement, 'fontSize', Math.min(72, currentSize + 1));
                  }}
                  style={{ background: 'transparent', border: 'none', color: '#fff', padding: '4px 8px', cursor: 'pointer' }}
                >
                  <Plus size={12} />
                </button>
              </div>

              {/* Botones de Estilos: Negrita, Itálica, Subrayado */}
              <div style={{ display: 'flex', gap: '2px', borderLeft: '1px solid var(--border-color)', paddingLeft: '8px' }}>
                <button 
                  onClick={() => updateStyleField(focusedElement, 'bold', !(activeStyles[focusedElement] || {}).bold)}
                  style={{ 
                    padding: '4px 8px', 
                    borderRadius: '4px',
                    background: (activeStyles[focusedElement] || {}).bold ? 'var(--accent-primary)' : 'transparent',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <Bold size={14} />
                </button>
                <button 
                  onClick={() => updateStyleField(focusedElement, 'italic', !(activeStyles[focusedElement] || {}).italic)}
                  style={{ 
                    padding: '4px 8px', 
                    borderRadius: '4px',
                    background: (activeStyles[focusedElement] || {}).italic ? 'var(--accent-primary)' : 'transparent',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <Italic size={14} />
                </button>
                <button 
                  onClick={() => updateStyleField(focusedElement, 'underline', !(activeStyles[focusedElement] || {}).underline)}
                  style={{ 
                    padding: '4px 8px', 
                    borderRadius: '4px',
                    background: (activeStyles[focusedElement] || {}).underline ? 'var(--accent-primary)' : 'transparent',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <Underline size={14} />
                </button>
              </div>

              {/* Botones de Alineación */}
              <div style={{ display: 'flex', gap: '2px', borderLeft: '1px solid var(--border-color)', paddingLeft: '8px' }}>
                <button 
                  onClick={() => updateStyleField(focusedElement, 'align', 'left')}
                  style={{ padding: '4px', border: 'none', cursor: 'pointer', background: (activeStyles[focusedElement] || {}).align === 'left' ? 'rgba(255,255,255,0.1)' : 'transparent', color: '#fff' }}
                >
                  <AlignLeft size={14} />
                </button>
                <button 
                  onClick={() => updateStyleField(focusedElement, 'align', 'center')}
                  style={{ padding: '4px', border: 'none', cursor: 'pointer', background: (activeStyles[focusedElement] || {}).align === 'center' ? 'rgba(255,255,255,0.1)' : 'transparent', color: '#fff' }}
                >
                  <AlignCenter size={14} />
                </button>
                <button 
                  onClick={() => updateStyleField(focusedElement, 'align', 'right')}
                  style={{ padding: '4px', border: 'none', cursor: 'pointer', background: (activeStyles[focusedElement] || {}).align === 'right' ? 'rgba(255,255,255,0.1)' : 'transparent', color: '#fff' }}
                >
                  <AlignRight size={14} />
                </button>
                <button 
                  onClick={() => updateStyleField(focusedElement, 'align', 'justify')}
                  style={{ padding: '4px', border: 'none', cursor: 'pointer', background: (activeStyles[focusedElement] || {}).align === 'justify' ? 'rgba(255,255,255,0.1)' : 'transparent', color: '#fff' }}
                >
                  <AlignJustify size={14} />
                </button>
              </div>

              {/* Paleta de colores */}
              <div style={{ display: 'flex', gap: '4px', borderLeft: '1px solid var(--border-color)', paddingLeft: '8px', overflowX: 'auto', maxWidth: '240px', paddingBottom: '2px' }}>
                {colorPalette.map((col, idx) => (
                  <button 
                    key={idx}
                    onClick={() => updateStyleField(focusedElement, 'color', col)}
                    style={{ 
                      width: '16px', 
                      height: '16px', 
                      borderRadius: '50%', 
                      background: col, 
                      border: (activeStyles[focusedElement] || {}).color === col ? '2px solid var(--accent-primary)' : '1px solid #444',
                      cursor: 'pointer' 
                    }}
                  />
                ))}
              </div>

              {/* Enlace del botón (se muestra en la barra superior solo si el botón está enfocado) */}
              {focusedElement === 'ctaText' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 8px', marginLeft: '8px' }}>
                  <Link size={12} style={{ color: 'var(--accent-primary)' }} />
                  <input 
                    type="text" 
                    value={data.ctaLink} 
                    onChange={e => updateField('ctaLink', e.target.value)}
                    style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '0.75rem', width: '150px', outline: 'none' }}
                    placeholder="Enlace del botón"
                  />
                </div>
              )}

            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <span>Edición de Correo</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Haz clic en cualquier texto del Canvas para formatearlo</span>
            </div>
          )}
        </div>

        {/* CONTENEDOR CENTRAL DEL LIENZO */}
        <div 
          style={{ 
            flex: 1, 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'flex-start',
            overflowY: 'auto',
            padding: '1rem 0',
            position: 'relative'
          }}
        >
          
          {/* OVERLAY DE CARGA DE IA */}
          {isGenerating && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 30, gap: '1rem', color: '#fff', borderRadius: '12px' }}>
              <Sparkles className="animate-spin" size={48} color="var(--accent-primary)" style={{ animationDuration: '3s' }} />
              <strong style={{ fontSize: '1rem' }}>Diseñando con Inteligencia Artificial...</strong>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Creando copys y estructurando el lienzo...</span>
            </div>
          )}

          {/* LIENZO REAL (MIMIC DE CORREO ELECTRONICO) */}
          <div 
            style={{ 
              width: '100%', 
              maxWidth: '560px', 
              borderRadius: '12px', 
              overflow: 'hidden', 
              background: canvasBackgroundStyle,
              backgroundColor: bgBaseColor,
              boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
              border: '1px solid var(--border-color)',
              color: isDarkCanvas ? '#ffffff' : '#2d3748',
              transition: 'all 0.3s'
            }}
          >
            
            {/* 1. Cabecera / Banner */}
            {data.templateDesign === 'catalogo' ? (
              <div style={{ padding: '15px 20px', borderBottom: '1px solid #edf2f7', display: 'flex', justifyContent: 'space-between', color: '#2d3748', fontFamily: 'Arial, sans-serif' }}>
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
                  ...getStyleObj('bannerTitle'),
                  margin: 0, 
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
                    ...getStyleObj('heading'),
                    margin: 0, 
                    outline: 'none'
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
                    ...getStyleObj('bodyText'),
                    lineHeight: '1.6', 
                    margin: 0, 
                    outline: 'none'
                  }}
                >
                  {data.bodyText}
                </p>
              </div>

              {/* Contenedores por plantilla */}
              {data.templateDesign === 'informativo' && (
                <div style={{ background: '#f7fafc', border: '1px dashed #cbd5e0', padding: '15px', borderRadius: '6px', marginBottom: '20px', color: '#4a5568', fontSize: '13px', fontFamily: 'Arial, sans-serif' }}>
                  <strong style={{ display: 'block', color: '#2d3748', marginBottom: '6px' }}>🔑 CONDICIONES DE AGENDA</strong>
                  • Retiro gratuito en sucursales EcoSilence.<br />
                  • Sanitización exhaustiva certificada.<br />
                  • Garantía y servicio de asistencia.
                </div>
              )}

              {data.templateDesign === 'catalogo' && (
                <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', fontFamily: 'Arial, sans-serif' }}>
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
                <span 
                  contentEditable={true}
                  suppressContentEditableWarning={true}
                  onBlur={(e) => updateField('ctaText', e.target.innerText)}
                  onClick={() => setFocusedElement('ctaText')}
                  style={{ 
                    ...getStyleObj('ctaText'),
                    background: '#2563eb', 
                    padding: '12px 24px', 
                    borderRadius: data.templateDesign === 'lanzamiento' ? '30px' : '4px',
                    display: 'inline-block',
                    outline: 'none',
                    cursor: 'text',
                    border: focusedElement === 'ctaText' ? '2px dashed var(--accent-primary)' : '2px solid transparent',
                  }}
                >
                  {data.ctaText}
                </span>
              </div>

            </div>

            {/* Footer */}
            <div style={{ padding: '20px 25px', background: data.templateDesign === 'lanzamiento' ? '#0f0f1b' : '#edf2f7', fontSize: '11px', textAlign: 'center', borderTop: '1px solid var(--border-color)', color: '#718096', fontFamily: 'Arial, sans-serif' }}>
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
