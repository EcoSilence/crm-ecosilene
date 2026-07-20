import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, RotateCcw, Sliders, Paintbrush, Check, Trash2, Undo } from 'lucide-react';
import { removeObjectFromImage } from '../services/aiInpaintingService';

const ImageEditorModal = ({ imageUrl, onClose, onSave }) => {
  const [activeTab, setActiveTab] = useState('filtros'); // 'filtros' | 'ajustes' | 'borrador'
  
  // 1. Estados de Ajustes Finos
  const [adjustments, setAdjustments] = useState({
    brightness: 0, // -100 to 100
    contrast: 0,   // -100 to 100
    saturation: 0, // -100 to 100
    hue: 0,        // -180 to 180 (matiz/temperatura)
    highlights: 0, // -100 to 100
    shadows: 0,    // -100 to 100
    blur: 0,       // 0 to 20
    sharpness: 0   // 0 to 10
  });

  // 2. Estado de Filtros Preset Seleccionados
  const [selectedFilter, setSelectedFilter] = useState('none');

  // 3. Estados de Borrador IA (Pincel & Máscara)
  const [brushSize, setBrushSize] = useState(25);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [maskHistory, setMaskHistory] = useState([]); // Historial para deshacer trazos de máscara

  // Refs de Canvas y cargador de Imagen
  const canvasRef = useRef(null);
  const maskCanvasRef = useRef(null);
  const imageRef = useRef(null);
  
  // 20 Presets estilo Instagram/VSCO/TikTok
  const filtersPreset = [
    { id: 'none', name: 'Original', css: 'none' },
    { id: 'vintage', name: 'Vintage', css: 'sepia(45%) contrast(85%) brightness(105%)' },
    { id: 'warm', name: 'Warm Sunshine', css: 'saturate(130%) sepia(20%) brightness(110%) contrast(95%)' },
    { id: 'cool', name: 'Cool Chill', css: 'hue-rotate(-15deg) saturate(110%) contrast(105%)' },
    { id: 'neon', name: 'Cyberpunk', css: 'hue-rotate(140deg) saturate(220%) contrast(110%)' },
    { id: 'drama', name: 'Drama', css: 'contrast(140%) brightness(90%) saturate(80%)' },
    { id: 'bw', name: 'B&W Contrast', css: 'grayscale(100%) contrast(160%) brightness(95%)' },
    { id: 'sepia', name: 'Sepia Nostalgia', css: 'sepia(100%) brightness(85%) contrast(105%)' },
    { id: 'vivid', name: 'Vivid Color', css: 'saturate(170%) brightness(105%) contrast(105%)' },
    { id: 'moody', name: 'Moody Dark', css: 'brightness(75%) contrast(115%) saturate(80%)' },
    { id: 'pastel', name: 'Soft Pastel', css: 'brightness(120%) saturate(70%) contrast(80%)' },
    { id: 'grain', name: 'Film Grain', css: 'contrast(95%) saturate(95%) sepia(12%)' },
    { id: 'cinema', name: 'Teal & Orange', css: 'hue-rotate(-10deg) saturate(125%) contrast(110%) brightness(95%)' },
    { id: 'golden', name: 'Golden Hour', css: 'sepia(30%) saturate(140%) brightness(105%) hue-rotate(5deg)' },
    { id: 'emerald', name: 'Emerald', css: 'hue-rotate(95deg) saturate(115%) brightness(100%)' },
    { id: 'summer', name: 'Summer Pop', css: 'saturate(145%) hue-rotate(8deg) brightness(105%)' },
    { id: 'fade', name: 'Fade Look', css: 'opacity(95%) contrast(85%) brightness(108%)' },
    { id: 'chrome', name: 'Chrome', css: 'contrast(130%) saturate(125%) brightness(100%)' },
    { id: 'noir', name: 'Noir', css: 'grayscale(100%) contrast(145%) brightness(80%)' },
    { id: 'kodak', name: 'Kodak Film', css: 'sepia(18%) saturate(120%) contrast(95%) brightness(108%)' },
    { id: 'velvet', name: 'Velvet', css: 'contrast(115%) saturate(130%) brightness(88%) hue-rotate(-8deg)' }
  ];

  // Cargar imagen de origen
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageRef.current = img;
      resetMaskCanvas();
      applyFiltersAndAdjustments();
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Re-aplicar filtros cada vez que cambien ajustes
  useEffect(() => {
    if (imageRef.current) {
      applyFiltersAndAdjustments();
    }
  }, [adjustments, selectedFilter]);

  const resetAdjustmentField = (field) => {
    setAdjustments(prev => ({ ...prev, [field]: 0 }));
  };

  const resetAllAdjustments = () => {
    setAdjustments({
      brightness: 0,
      contrast: 0,
      saturation: 0,
      hue: 0,
      highlights: 0,
      shadows: 0,
      blur: 0,
      sharpness: 0
    });
    setSelectedFilter('none');
  };

  // Renderizar filtros combinados con controles finos
  const applyFiltersAndAdjustments = () => {
    const canvas = canvasRef.current;
    if (!canvas || !imageRef.current) return;

    const ctx = canvas.getContext('2d');
    const img = imageRef.current;

    // Redimensionar Canvas para calzar proporción de la imagen (máx 800px ancho)
    const maxWidth = 800;
    let width = img.naturalWidth || img.width;
    let height = img.naturalHeight || img.height;

    if (width > maxWidth) {
      height = (maxWidth / width) * height;
      width = maxWidth;
    }

    canvas.width = width;
    canvas.height = height;

    // Limpiar canvas
    ctx.clearRect(0, 0, width, height);

    // 1. Construir String de Filtros de Canvas 2D
    const preset = filtersPreset.find(f => f.id === selectedFilter);
    let filterString = preset && preset.css !== 'none' ? preset.css : '';

    // Añadir controles finos
    filterString += ` brightness(${100 + adjustments.brightness}%)`;
    filterString += ` contrast(${100 + adjustments.contrast}%)`;
    filterString += ` saturate(${100 + adjustments.saturation}%)`;
    filterString += ` hue-rotate(${adjustments.hue}deg)`;
    
    if (adjustments.blur > 0) {
      filterString += ` blur(${adjustments.blur / 4}px)`;
    }

    ctx.filter = filterString.trim();

    // Dibujar imagen con filtros activos
    ctx.drawImage(img, 0, 0, width, height);

    // Ajustar altas luces y sombras manualmente si están activas (highlights/shadows)
    if (adjustments.highlights !== 0 || adjustments.shadows !== 0) {
      const imgData = ctx.getImageData(0, 0, width, height);
      const data = imgData.data;
      
      const hlVal = adjustments.highlights / 100;
      const shVal = adjustments.shadows / 100;

      for (let i = 0; i < data.length; i += 4) {
        // Luminancia básica
        const r = data[i];
        const g = data[i+1];
        const b = data[i+2];
        const luma = 0.299 * r + 0.587 * g + 0.114 * b;

        // Ajustar Altas Luces (zonas claras)
        if (luma > 180 && hlVal !== 0) {
          const factor = (luma - 180) / 75; // intensidad
          data[i] = Math.min(255, Math.max(0, r + hlVal * 30 * factor));
          data[i+1] = Math.min(255, Math.max(0, g + hlVal * 30 * factor));
          data[i+2] = Math.min(255, Math.max(0, b + hlVal * 30 * factor));
        }

        // Ajustar Sombras (zonas oscuras)
        if (luma < 80 && shVal !== 0) {
          const factor = (80 - luma) / 80;
          data[i] = Math.min(255, Math.max(0, r + shVal * 35 * factor));
          data[i+1] = Math.min(255, Math.max(0, g + shVal * 35 * factor));
          data[i+2] = Math.min(255, Math.max(0, b + shVal * 35 * factor));
        }
      }

      ctx.putImageData(imgData, 0, 0);
    }

    // Ajustar nitidez/enfoque (Sharpness) usando convolución básica
    if (adjustments.sharpness > 0) {
      const imgData = ctx.getImageData(0, 0, width, height);
      const output = ctx.createImageData(width, height);
      const weights = [
        0, -1, 0,
        -1, 5, -1,
        0, -1, 0
      ];
      // Aplicar convolución ponderada por el valor de nitidez
      const mix = adjustments.sharpness / 10;
      applyConvolution(imgData, output, weights, width, height, mix);
      ctx.putImageData(output, 0, 0);
    }
  };

  // Algoritmo de convolución para filtros de nitidez
  const applyConvolution = (input, output, weights, w, h, mix) => {
    const side = Math.round(Math.sqrt(weights.length));
    const halfSide = Math.floor(side / 2);
    const src = input.data;
    const dst = output.data;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const sy = y;
        const sx = x;
        const dstOff = (y * w + x) * 4;
        
        let r = 0, g = 0, b = 0;
        
        for (let cy = 0; cy < side; cy++) {
          for (let cx = 0; cx < side; cx++) {
            const scy = Math.min(h - 1, Math.max(0, sy + cy - halfSide));
            const scx = Math.min(w - 1, Math.max(0, sx + cx - halfSide));
            const srcOff = (scy * w + scx) * 4;
            const wt = weights[cy * side + cx];
            
            r += src[srcOff] * wt;
            g += src[srcOff + 1] * wt;
            b += src[srcOff + 2] * wt;
          }
        }
        
        // Mezclar nitidez con original
        dst[dstOff] = src[dstOff] * (1 - mix) + Math.min(255, Math.max(0, r)) * mix;
        dst[dstOff + 1] = src[dstOff + 1] * (1 - mix) + Math.min(255, Math.max(0, g)) * mix;
        dst[dstOff + 2] = src[dstOff + 2] * (1 - mix) + Math.min(255, Math.max(0, b)) * mix;
        dst[dstOff + 3] = src[dstOff + 3]; // Opacidad intacta
      }
    }
  };

  // Inicializar canvas de la máscara de Borrador IA
  const resetMaskCanvas = () => {
    const canvas = canvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!canvas || !maskCanvas) return;

    maskCanvas.width = canvas.width;
    maskCanvas.height = canvas.height;

    const ctx = maskCanvas.getContext('2d');
    ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    setMaskHistory([]);
  };

  // Lógica de Dibujo de Máscara de Borrador IA
  const getCanvasMousePos = (e) => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    // Soporte para touch y mouse
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height
    };
  };

  const handleStartDrawing = (e) => {
    if (activeTab !== 'borrador') return;
    setIsDrawing(true);
    
    // Guardar estado actual en el historial para Deshacer
    saveMaskState();

    const ctx = maskCanvasRef.current.getContext('2d');
    const pos = getCanvasMousePos(e);
    
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)'; // Rojo semitransparente para marcar objeto
    ctx.lineWidth = brushSize;
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const handleDrawing = (e) => {
    if (!isDrawing || activeTab !== 'borrador') return;
    const ctx = maskCanvasRef.current.getContext('2d');
    const pos = getCanvasMousePos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const handleStopDrawing = () => {
    setIsDrawing(false);
  };

  const saveMaskState = () => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL();
    setMaskHistory(prev => [...prev, dataUrl]);
  };

  const handleUndoMask = () => {
    if (maskHistory.length === 0) return;
    const previousState = maskHistory[maskHistory.length - 1];
    setMaskHistory(prev => prev.slice(0, -1));

    const canvas = maskCanvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
    };
    img.src = previousState;
  };

  // Acción del Borrador IA
  const handleAIErase = async () => {
    const canvas = canvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!canvas || !maskCanvas) return;

    setIsProcessingAI(true);

    try {
      // 1. Obtener imagen de base (actualizada con los filtros y ajustes)
      const baseImageBase64 = canvas.toDataURL('image/jpeg', 0.9);

      // 2. Crear la máscara final en Blanco y Negro (Fondo Negro, Brocha Blanca)
      const bnCanvas = document.createElement('canvas');
      bnCanvas.width = maskCanvas.width;
      bnCanvas.height = maskCanvas.height;
      const bnCtx = bnCanvas.getContext('2d');
      
      // Fondo Negro
      bnCtx.fillStyle = '#000000';
      bnCtx.fillRect(0, 0, bnCanvas.width, bnCanvas.height);

      // Dibujar la máscara pintada por el usuario en color Blanco
      const maskCtx = maskCanvas.getContext('2d');
      const maskImgData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
      const data = maskImgData.data;

      // Iterar sobre pixeles y pintar de blanco puro en bnCanvas donde haya pincelada
      bnCtx.fillStyle = '#ffffff';
      for (let y = 0; y < maskCanvas.height; y++) {
        for (let x = 0; x < maskCanvas.width; x++) {
          const idx = (y * maskCanvas.width + x) * 4;
          // Si hay opacidad de brocha roja
          if (data[idx + 3] > 10) {
            bnCtx.fillRect(x, y, 1, 1);
          }
        }
      }

      const maskImageBase64 = bnCanvas.toDataURL('image/png');

      // 3. Enviar a la API mediante nuestro servicio
      const resultBase64 = await removeObjectFromImage(baseImageBase64, maskImageBase64);

      // 4. Actualizar la imagen de origen y recargar lienzo
      const newImg = new Image();
      newImg.crossOrigin = "anonymous";
      newImg.onload = () => {
        imageRef.current = newImg;
        resetMaskCanvas();
        applyFiltersAndAdjustments();
        setIsProcessingAI(false);
      };
      newImg.src = resultBase64;

    } catch (error) {
      console.error(error);
      setIsProcessingAI(false);
      alert("Hubo un error procesando el Borrado por IA. Inténtalo de nuevo.");
    }
  };

  // Exportar y Guardar Imagen Editada en CRM
  const handleSaveAndInsert = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Obtener data URL de la imagen resultante
    const editedDataUrl = canvas.toDataURL('image/jpeg', 0.95);
    onSave(editedDataUrl);
    onClose();
  };

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
    >
      <div 
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '1100px',
          height: 'calc(100vh - 2rem)',
          maxHeight: '850px',
          background: 'var(--bg-dark)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
          position: 'relative'
        }}
      >
        {/* Cabecera del modal */}
        <div style={{ padding: '0.8rem 1.2rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} color="var(--accent-primary)" />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>Editor de Imágenes Avanzado con IA</h3>
          </div>
          <button 
            onClick={onClose}
            className="btn btn-ghost" 
            style={{ padding: '6px', borderRadius: '50%', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Cuerpo del Editor */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          
          {/* Panel Izquierdo de Controles */}
          <div 
            style={{ 
              width: '320px', 
              background: 'rgba(0,0,0,0.2)', 
              borderRight: '1px solid var(--border-color)', 
              display: 'flex', 
              flexDirection: 'column', 
              height: '100%' 
            }}
          >
            
            {/* Pestañas de Edición */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.1)' }}>
              {[
                { id: 'filtros', label: 'Filtros', icon: Sliders },
                { id: 'ajustes', label: 'Ajustes', icon: RotateCcw },
                { id: 'borrador', label: 'Borrador IA', icon: Paintbrush }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    if (tab.id === 'borrador') {
                      setTimeout(resetMaskCanvas, 50); // Inicializar máscara canvas al entrar
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 4px',
                    border: 'none',
                    borderBottom: activeTab === tab.id ? '2px solid var(--accent-primary)' : '2px solid transparent',
                    background: 'transparent',
                    color: activeTab === tab.id ? 'var(--text-main)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: activeTab === tab.id ? 700 : 500,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.2s'
                  }}
                >
                  <tab.icon size={14} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Contenidos de las solapas */}
            <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* Tab 1: FILTROS PREESTABLECIDOS (Presets) */}
              {activeTab === 'filtros' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>Selecciona un Preset Estilo Redes Sociales:</span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                    {filtersPreset.map(filter => (
                      <button
                        key={filter.id}
                        onClick={() => setSelectedFilter(filter.id)}
                        style={{
                          padding: '10px 8px',
                          borderRadius: '8px',
                          background: selectedFilter === filter.id ? 'rgba(37,99,235,0.15)' : 'rgba(255,255,255,0.02)',
                          border: selectedFilter === filter.id ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                          color: selectedFilter === filter.id ? '#fff' : 'var(--text-muted)',
                          fontSize: '0.75rem',
                          textAlign: 'center',
                          cursor: 'pointer',
                          fontWeight: selectedFilter === filter.id ? 700 : 500,
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => { if(selectedFilter !== filter.id) e.currentTarget.style.borderColor = '#444'; }}
                        onMouseLeave={e => { if(selectedFilter !== filter.id) e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                      >
                        {filter.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 2: AJUSTES FINOS */}
              {activeTab === 'ajustes' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {[
                    { id: 'brightness', label: 'Brillo', min: -100, max: 100, unit: '%' },
                    { id: 'contrast', label: 'Contraste', min: -100, max: 100, unit: '%' },
                    { id: 'saturation', label: 'Saturación', min: -100, max: 100, unit: '%' },
                    { id: 'hue', label: 'Temperatura (Matiz)', min: -180, max: 180, unit: '°' },
                    { id: 'highlights', label: 'Blancos / Luces', min: -100, max: 100, unit: '%' },
                    { id: 'shadows', label: 'Sombras', min: -100, max: 100, unit: '%' },
                    { id: 'blur', label: 'Desenfoque', min: 0, max: 20, unit: 'px' },
                    { id: 'sharpness', label: 'Enfoque / Nitidez', min: 0, max: 10, unit: '' }
                  ].map(adj => (
                    <div key={adj.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-main)', fontWeight: 500 }}>{adj.label}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{adjustments[adj.id]}{adj.unit}</span>
                          {adjustments[adj.id] !== 0 && (
                            <button
                              onClick={() => resetAdjustmentField(adj.id)}
                              style={{ background: 'transparent', border: 'none', color: '#ffaaaa', cursor: 'pointer', fontSize: '9px', padding: 0 }}
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </div>
                      <input
                        type="range"
                        min={adj.min}
                        max={adj.max}
                        value={adjustments[adj.id]}
                        onChange={e => setAdjustments(prev => ({ ...prev, [adj.id]: parseFloat(e.target.value) }))}
                        style={{ width: '100%', accentColor: 'var(--accent-primary)', height: '4px' }}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Tab 3: BORRADOR IA (Inpainting) */}
              {activeTab === 'borrador' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px', fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                    <strong>Instrucciones Borrador IA:</strong><br />
                    1. Pinta directamente sobre los objetos que desees eliminar de tu imagen en la vista del Canvas.<br />
                    2. Ajusta el grosor del pincel según el tamaño del objeto.<br />
                    3. Haz clic en "Eliminar Objeto por IA".
                  </div>

                  {/* Slider de Pincel */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-main)', fontWeight: 500 }}>Grosor del Pincel</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{brushSize}px</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="100"
                      value={brushSize}
                      onChange={e => setBrushSize(parseInt(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
                    />
                  </div>

                  {/* Botones de Acción Máscara */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button
                      onClick={handleUndoMask}
                      disabled={maskHistory.length === 0}
                      className="btn btn-ghost"
                      style={{ flex: 1, fontSize: '0.75rem', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                    >
                      <Undo size={12} /> Deshacer
                    </button>
                    <button
                      onClick={resetMaskCanvas}
                      className="btn btn-ghost"
                      style={{ flex: 1, fontSize: '0.75rem', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', color: '#ffaaaa' }}
                    >
                      <Trash2 size={12} /> Limpiar
                    </button>
                  </div>

                  <button
                    onClick={handleAIErase}
                    disabled={isProcessingAI}
                    className="btn btn-primary"
                    style={{ width: '100%', marginTop: '0.8rem', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'var(--accent-gradient)' }}
                  >
                    <Sparkles size={14} /> Eliminar Objeto por IA
                  </button>
                </div>
              )}
            </div>

            {/* Footer de Controles de Reset General */}
            <div style={{ padding: '0.8rem 1rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={resetAllAdjustments}
                className="btn btn-ghost"
                style={{ width: '100%', fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '6px' }}
              >
                <RotateCcw size={12} /> Restablecer Ajustes
              </button>
            </div>

          </div>

          {/* Área Central: Visualizador de Canvas */}
          <div 
            style={{ 
              flex: 1, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              background: '#0a0a0f', 
              padding: '1rem', 
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Contenedor relativo de lienzo doble (Imagen + Máscara) */}
            <div style={{ position: 'relative', maxWidth: '100%', maxHeight: '100%', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
              
              {/* 1. Canvas de la imagen procesada con Filtros/Ajustes */}
              <canvas 
                ref={canvasRef} 
                style={{ 
                  display: 'block',
                  maxWidth: '100%', 
                  maxHeight: '52vh', 
                  objectFit: 'contain',
                  borderRadius: '6px'
                }} 
              />

              {/* 2. Canvas de máscara para dibujar (solo visible/interactiva en solapa Borrador IA) */}
              <canvas
                ref={maskCanvasRef}
                onMouseDown={handleStartDrawing}
                onMouseMove={handleDrawing}
                onMouseUp={handleStopDrawing}
                onMouseLeave={handleStopDrawing}
                onTouchStart={handleStartDrawing}
                onTouchMove={handleDrawing}
                onTouchEnd={handleStopDrawing}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  cursor: activeTab === 'borrador' ? 'crosshair' : 'default',
                  zIndex: activeTab === 'borrador' ? 5 : -1,
                  opacity: activeTab === 'borrador' ? 1 : 0,
                  transition: 'opacity 0.2s',
                  pointerEvents: activeTab === 'borrador' ? 'auto' : 'none'
                }}
              />

            </div>

            {/* Spinner de Carga de Borrado IA */}
            {isProcessingAI && (
              <div 
                style={{ 
                  position: 'absolute', 
                  inset: 0, 
                  background: 'rgba(0,0,0,0.8)', 
                  zIndex: 20, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '1rem' 
                }}
              >
                <Sparkles className="animate-spin" size={42} color="var(--accent-primary)" style={{ animationDuration: '3s' }} />
                <strong style={{ color: '#fff', fontSize: '1rem' }}>Borrando objeto con IA...</strong>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>El modelo está reconstruyendo la zona pintada...</span>
              </div>
            )}
          </div>

        </div>

        {/* Footer del Modal */}
        <div style={{ padding: '0.8rem 1.2rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '0.8rem', background: 'rgba(0,0,0,0.1)' }}>
          <button 
            onClick={onClose} 
            className="btn btn-ghost"
            style={{ fontSize: '0.82rem', padding: '6px 12px' }}
          >
            Cancelar
          </button>
          <button 
            onClick={handleSaveAndInsert}
            className="btn btn-primary"
            style={{ fontSize: '0.82rem', padding: '6px 16px', display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--accent-gradient)' }}
          >
            <Check size={14} /> Guardar e Insertar en la Plantilla
          </button>
        </div>

      </div>
    </div>
  );
};

export default ImageEditorModal;
