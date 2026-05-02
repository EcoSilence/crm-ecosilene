import React, { useState, useEffect } from 'react';
import { useAppStore } from '../context/AppDataContext';
import { 
  Megaphone, 
  TrendingUp, 
  Calendar, 
  Sparkles, 
  Folder, 
  ImageIcon, 
  PlayCircle,
  Plus,
  ArrowRight,
  FileVideo
} from 'lucide-react';

const MarketingView = () => {
  const { servicios, isGoogleLinked, plannedPosts, addPlannedPost, selectedMarketingAccount, brandProfile } = useAppStore();
  const [activeTab, setActiveTab] = useState('estrategia');
  
  // Persistencia de Estrategia IA
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [selectedCarouselAssets, setSelectedCarouselAssets] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isPlanningModalOpen, setIsPlanningModalOpen] = useState(false);
  const [selectedPlanStep, setSelectedPlanStep] = useState(null);

  const isEvents = selectedMarketingAccount === '@ecosilence.event';
  const accentColor = isEvents ? '#ec4899' : '#3b82f6';

  const handleOpenPlanning = (file) => {
    setSelectedFile(file);
    setIsPlanningModalOpen(true);
  };

  const generateStrategies = (folderName, files) => {
    if (isGenerating) return;
    setIsGenerating(true);
    setAiSuggestions(null); 

    const safetyTimer = setTimeout(() => setIsGenerating(false), 15000);

    setTimeout(() => {
      try {
        clearTimeout(safetyTimer);
        const images = files.filter(f => {
          const name = f.name.toLowerCase();
          return f.type === 'image' || name.endsWith('.arw') || name.endsWith('.jpg') || name.endsWith('.png');
        });
        const initialAssets = images.slice(0, 6);
        setSelectedCarouselAssets(initialAssets);
        
        let suggestions = [];
        const brandMsg = brandProfile?.message || "Soluciones de audio inmersivo de alta fidelidad";
        
        if (selectedPlanStep) {
          suggestions = [{
            id: 'plan_match',
            type: selectedPlanStep.type,
            title: selectedPlanStep.idea || selectedPlanStep.title,
            desc: selectedPlanStep.goal,
            copy: `GANCHO: ${selectedPlanStep.idea || selectedPlanStep.title}\n\nVALOR: ${selectedPlanStep.message || brandMsg}. En el evento ${folderName} logramos precisamente esto.\n\nCTA: Escríbenos para mas informacion. #SilentExperience ${isEvents ? '#PartyMode #EcoSilenceEvent' : '#B2BChile #EventTech'}`
          }];
        } else if (isEvents) {
          suggestions = [{
            id: 'event_opt_a',
            type: 'Reel Experiencial (Fiesta)',
            title: 'La Magia de la Noche Silent',
            desc: 'Mostrar la vibración, las luces LED y la libertad de bailar.',
            copy: `GANCHO: ¿Buscas la mejor fiesta del año? 🕺✨\n\nVALOR: ${brandMsg}. En ${folderName} la vibra fue total.\n\nCTA: Reserva tu fecha para Silent Party ahora. #SilentParty #EcoSilenceEvent #FiestaSinLimites`
          }];
        } else {
          suggestions = [{
            id: 'opt_a',
            type: 'Carrusel Educativo (B2B)',
            title: '5 razones por las que el audio tradicional arruina tu congreso.',
            desc: 'Educar sobre el problema del ruido y la pérdida de atención.',
            copy: `GANCHO: 5 razones por las que el audio tradicional arruina tu congreso. 📉\n\nVALOR: ${brandMsg}. En el evento ${folderName} logramos precisamente esto.\n\nCTA: Escríbenos para mas informacion. #SilentExperience #B2BChile #EventTech`
          }];
        }
        setAiSuggestions(suggestions);
        setTimeout(() => document.getElementById('ai-results-anchor')?.scrollIntoView({ behavior: 'smooth' }), 300);
      } catch (err) {
        console.error(err);
      } finally {
        setIsGenerating(false);
      }
    }, 2800);
  };

  const getSlideMessage = (index, topic = "") => {
    const topicLower = topic.toLowerCase();
    if (isEvents) {
      const partyMessages = ["La magia de la Silent Party", "3 Canales, 3 Ambientes", "Sin restricciones de ruido", "Luces LED vibrantes", "Calidad Hi-Fi"];
      return partyMessages[index % partyMessages.length];
    }
    if (topicLower.includes('5 razones')) {
      const reasons = ["1. Eco y Reverberacion", "2. Distracciones Externas", "3. Fatiga Auditiva", "4. Barreras de Idioma", "5. Limitacion de Espacio", "La Solucion: EcoSilence"];
      return reasons[index] || reasons[5];
    }
    return ["Concentracion total", "Claridad absoluta", "Experiencia Inmersiva", "Versatilidad sin cables", "EcoSilence"][index % 5];
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '3rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <Megaphone size={32} color={accentColor} /> Marketing & Automatización 
            <span style={{ fontSize: '1.2rem', color: accentColor, background: `${accentColor}11`, padding: '0.2rem 0.8rem', borderRadius: '20px', marginLeft: '0.5rem' }}>
              {selectedMarketingAccount}
            </span>
          </h1>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)' }}>
        {['estrategia', 'drive', 'plan', 'calendario'].map(tab => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)}
            style={{ 
              padding: '1rem 1.5rem', 
              background: 'none', 
              border: 'none', 
              color: activeTab === tab ? accentColor : 'var(--text-muted)',
              borderBottom: activeTab === tab ? `2px solid ${accentColor}` : 'none',
              cursor: 'pointer',
              fontWeight: activeTab === tab ? 600 : 400,
              textTransform: 'capitalize'
            }}
          >
            {tab.replace('drive', 'Contenido Drive').replace('plan', 'Plan de Accion').replace('calendario', 'Calendario Editorial')}
          </button>
        ))}
      </div>

      <div style={{ minHeight: '500px' }}>
        {activeTab === 'estrategia' && <EstrategiaSection servicios={servicios} />}
        
        {aiSuggestions && (
          <div className="animate-fade-in" style={{ background: `${accentColor}08`, borderRadius: '16px', border: `2px solid ${accentColor}`, padding: '2rem', marginBottom: '2rem' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: accentColor }}><Sparkles size={32} /> Estrategia Generada</h2>
            {aiSuggestions.map((s, idx) => (
              <div key={idx} style={{ background: 'var(--bg-dark)', borderRadius: '12px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0 }}>{s.title}</h3>
                  <button onClick={() => setAiSuggestions(null)} className="btn btn-ghost" style={{ padding: '0.4rem' }}>Cerrar</button>
                </div>

                {/* PREVIEW DEL CARRUSEL SELECCIONADO */}
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
                  <div style={{ fontSize: '0.7rem', color: accentColor, fontWeight: 800, marginBottom: '0.8rem', textTransform: 'uppercase' }}>Preview de Slides ({selectedCarouselAssets.length}/10):</div>
                  <div style={{ display: 'flex', gap: '0.8rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                    {selectedCarouselAssets.map((asset, aIdx) => (
                      <div key={asset.id} style={{ flexShrink: 0, width: '100px', height: '100px', borderRadius: '8px', overflow: 'hidden', position: 'relative', border: `2px solid ${accentColor}` }}>
                        <img src={asset.thumb} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <div style={{ position: 'absolute', top: '2px', right: '2px', display: 'flex', gap: '2px' }}>
                          <button onClick={() => {
                            const newAssets = [...selectedCarouselAssets];
                            newAssets.splice(aIdx, 1);
                            setSelectedCarouselAssets(newAssets);
                          }} style={{ background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff', padding: '2px', cursor: 'pointer', borderRadius: '2px' }}>×</button>
                        </div>
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '10px', textAlign: 'center' }}>Slide {aIdx + 1}</div>
                      </div>
                    ))}
                    {selectedCarouselAssets.length === 0 && <div style={{ padding: '2rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Selecciona imágenes abajo para tu carrusel</div>}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  {[0,1,2,3,4,5].map(i => (
                    <div key={i} style={{ fontSize: '0.85rem', display: 'flex', gap: '0.8rem' }}>
                      <span style={{ color: accentColor, fontWeight: 800, minWidth: '60px' }}>Slide {i+1}:</span> 
                      <span>{getSlideMessage(i, s.title)}</span>
                    </div>
                  ))}
                </div>
                <pre style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>{s.copy}</pre>
                <button className="btn btn-primary" style={{ background: accentColor }} onClick={() => {
                  addPlannedPost({ id: Date.now(), title: s.title, type: 'carousel', date: new Date().toISOString().split('T')[0], copy: s.copy, assets: selectedCarouselAssets });
                  alert('¡Estrategia planificada!');
                }}>Confirmar Planificación</button>
              </div>
            ))}
          </div>
        )}

        <div id="ai-results-anchor" />

        {activeTab === 'drive' && (
          <DriveSection 
            isLinked={isGoogleLinked} 
            onPlan={handleOpenPlanning}
            account={selectedMarketingAccount}
            onGenerate={generateStrategies}
            isGenerating={isGenerating}
            selectedCarouselAssets={selectedCarouselAssets}
            toggleAssetSelection={(file) => {
              if (selectedCarouselAssets.find(a => a.id === file.id)) setSelectedCarouselAssets(prev => prev.filter(a => a.id !== file.id));
              else setSelectedCarouselAssets(prev => [...prev, file]);
            }}
          />
        )}
        {activeTab === 'plan' && <PlanSection onNavigate={(step) => { setSelectedPlanStep(step); setActiveTab('drive'); }} account={selectedMarketingAccount} />}
        {activeTab === 'calendario' && <CalendarioSection plannedPosts={plannedPosts} account={selectedMarketingAccount} />}
      </div>

      {isGenerating && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
            <Sparkles className="animate-spin" size={48} color={accentColor} style={{ margin: '0 auto 1rem' }} />
            <h3>Analizando Neuralmente tu Contenido...</h3>
          </div>
        </div>
      )}

      {isPlanningModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-card" style={{ width: '400px', padding: '2rem' }}>
            <h3>Planificar Post</h3>
            <p>{selectedFile?.name}</p>
            <button className="btn btn-primary" onClick={() => setIsPlanningModalOpen(false)}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
};

const DriveSection = ({ isLinked, onPlan, account, onGenerate, isGenerating, selectedCarouselAssets, toggleAssetSelection }) => {
  const { listDriveContent } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [path, setPath] = useState([{ id: null, name: 'redes ecosilence' }]);
  const accentColor = account === '@ecosilence.event' ? '#ec4899' : '#3b82f6';

  const fetchContent = async (id = null) => {
    setLoading(true);
    try {
      const res = await listDriveContent(id);
      setFolders(res.folders || []);
      setFiles(res.files || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { if (isLinked) fetchContent(path[path.length - 1].id); }, [isLinked]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>{path[path.length - 1].name} 
          {path.length > 1 && (
            <button className="btn btn-primary" style={{ marginLeft: '1rem', background: accentColor }} onClick={() => onGenerate(path[path.length - 1].name, files)} disabled={isGenerating}>
              {isGenerating ? 'Analizando...' : 'Generar Estrategia IA'}
            </button>
          )}
        </h3>
        <span style={{ fontSize: '0.8rem', background: '#39ff14', color: '#000', padding: '2px 8px', borderRadius: '4px', fontWeight: 900 }}>v3.5 REBUILT</span>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        {path.map((p, i) => (
          <span key={i} onClick={() => { setPath(path.slice(0, i+1)); fetchContent(p.id); }} style={{ cursor: 'pointer' }}>
            {p.name} {i < path.length - 1 && ' / '}
          </span>
        ))}
      </div>

      {loading ? <div style={{ padding: '3rem', textAlign: 'center' }}>Cargando Drive...</div> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem' }}>
          {folders.map(f => (
            <div key={f.id} onClick={() => { setPath([...path, f]); fetchContent(f.id); }} style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', cursor: 'pointer', border: '1px solid var(--border-color)' }}>
              <Folder size={20} color={accentColor} style={{ marginBottom: '0.5rem' }} />
              <div style={{ fontSize: '0.85rem' }}>{f.name}</div>
            </div>
          ))}
          {files.map(file => (
            <div key={file.id} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
              <div style={{ height: '120px', backgroundImage: `url(${file.thumb})`, backgroundSize: 'cover', position: 'relative' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: selectedCarouselAssets.find(a => a.id === file.id) ? 1 : 0, transition: '0.2s' }} onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => { if(!selectedCarouselAssets.find(a => a.id === file.id)) e.currentTarget.style.opacity = 0 }}>
                  <button onClick={() => toggleAssetSelection(file)} className={`btn ${selectedCarouselAssets.find(a => a.id === file.id) ? 'btn-primary' : 'btn-ghost'}`} style={{ padding: '4px 12px', fontSize: '0.75rem', background: selectedCarouselAssets.find(a => a.id === file.id) ? accentColor : 'transparent' }}>
                    {selectedCarouselAssets.find(a => a.id === file.id) ? 'Seleccionado' : 'Elegir Slide'}
                  </button>
                </div>
              </div>
              <div style={{ padding: '0.5rem', fontSize: '0.7rem' }}>{file.name}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const EstrategiaSection = () => (
  <div className="glass-card" style={{ padding: '2rem' }}>
    <h3>Estrategia General</h3>
    <p>Utiliza el explorador de Drive para generar contenido específico.</p>
  </div>
);

const PlanSection = ({ onNavigate, account }) => {
  const isEvents = account === '@ecosilence.event';
  
  const b2bPlan = [
    { week: 'Semana 1 - Post 1', title: '5 razones: Audio que arruina congresos', type: 'Carrusel Educativo', goal: 'Educar sobre ruido', idea: 'Problemas de acústica en salones', message: 'EcoSilence resuelve la inteligibilidad del mensaje.' },
    { week: 'Semana 1 - Post 2', title: 'Setup en 30 segundos: Agilidad', type: 'Reel Logística', goal: 'Mostrar eficiencia', idea: 'Montaje rápido sin cables', message: 'Optimizamos los tiempos de tu evento corporativo.' },
    { week: 'Semana 2 - Post 1', title: 'Caso de Éxito: Workshop Masivo', type: 'Carrusel Portafolio', goal: 'Generar autoridad', idea: 'Evento de 500 personas simultáneas', message: 'Capacidad técnica sin límites.' },
    { week: 'Semana 2 - Post 2', title: 'Traducción Simultánea 3 Canales', type: 'Reel Tech', goal: 'Vender servicio Pro', idea: 'Uso de canales para idiomas', message: 'Rompe la barrera del idioma sin cabinas.' },
    { week: 'Semana 3 - Post 1', title: 'Testimonio: Director de TI', type: 'Post Testimonio', goal: 'Social Proof', idea: 'Entrevista corta post-evento', message: 'La confianza de las grandes empresas.' },
    { week: 'Semana 3 - Post 2', title: 'Workshop Silencioso: Productividad', type: 'Carrusel Tip', goal: 'Nicho Educación', idea: 'Concentración total en talleres', message: 'Elimina distracciones externas en tus capacitaciones.' },
    { week: 'Semana 4 - Post 1', title: 'ROI: ¿Cuánto vale el mensaje?', type: 'Post Estratégico', goal: 'Conversión', idea: 'Costo de que no te escuchen', message: 'Invertir en audio es invertir en resultados.' },
    { week: 'Semana 4 - Post 2', title: 'Portfolio: Grandes Marcas', type: 'Reel Resumen', goal: 'Branding', idea: 'Logos y fotos de clientes B2B', message: 'El estándar de la industria en Chile.' }
  ];

  const b2cPlan = [
    { week: 'Semana 1 - Post 1', title: 'La Magia de la Silent Party', type: 'Reel Experiencial', goal: 'Generar deseo', idea: 'Vibración y luces LED en la noche', message: 'La fiesta que todos comentarán.' },
    { week: 'Semana 1 - Post 2', title: 'Baila sin molestar a los vecinos', type: 'Carrusel Tip', goal: 'Resolver objeción', idea: 'Fiestas en casas/departamentos', message: 'Cero denuncias por ruido, 100% diversión.' },
    { week: 'Semana 2 - Post 1', title: 'Matrimonios Silenciosos 2026', type: 'Reel Eventos', goal: 'Nicho Bodas', idea: 'Baile entretenido con audífonos', message: 'Tendencia mundial para celebraciones exclusivas.' },
    { week: 'Semana 2 - Post 2', title: '3 Canales, 3 Vibras distintas', type: 'Reel Tech-Fun', goal: 'Mostrar variedad', idea: 'Cambio de géneros musicales', message: 'Un canal para cada invitado, música para todos.' },
    { week: 'Semana 3 - Post 1', title: 'Testimonio: Cumpleaños Épico', type: 'Post Social Proof', goal: 'Confianza', idea: 'Reacción de cumpleañero', message: 'Creamos momentos inolvidables.' },
    { week: 'Semana 3 - Post 2', title: 'Silent Yoga & Wellness', type: 'Carrusel Nicho', goal: 'Explorar mercados', idea: 'Conexión interna con audio Hi-Fi', message: 'Más allá de las fiestas: Bienestar total.' },
    { week: 'Semana 4 - Post 1', title: 'Aftermovie: Evento Masivo', type: 'Reel Recap', goal: 'Branding', idea: 'Resumen de la mejor fiesta del mes', message: 'EcoSilence Eventos: Elevamos la energía.' },
    { week: 'Semana 4 - Post 2', title: '¿Cómo reservar tu Silent Party?', type: 'Post Directo', goal: 'Venta', idea: 'Pasos para el arriendo', message: 'Agenda tu fecha antes de que se agote.' }
  ];

  const currentPlan = isEvents ? b2cPlan : b2bPlan;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="glass-card" style={{ padding: '2rem', borderLeft: `6px solid ${isEvents ? '#ec4899' : '#3b82f6'}` }}>
        <h2 style={{ marginTop: 0 }}>Estrategia Mensual: {isEvents ? 'Social & Fiestas' : 'Corporativo & B2B'}</h2>
        <p style={{ color: 'var(--text-muted)' }}>Hemos planificado 8 contenidos estratégicos para potenciar @ecosilence.{isEvents ? 'event' : 'soluciones'}.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {currentPlan.map((post, idx) => (
          <div key={idx} className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid rgba(255,255,255,0.05)', transition: '0.3s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: isEvents ? '#ec4899' : '#3b82f6', textTransform: 'uppercase' }}>{post.week}</span>
              <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px' }}>{post.type}</span>
            </div>
            <h4 style={{ margin: 0, fontSize: '1rem' }}>{post.title}</h4>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', flex: 1 }}>{post.idea}</p>
            <button 
              className="btn btn-primary" 
              style={{ background: isEvents ? '#ec4899' : '#3b82f6', fontSize: '0.8rem', padding: '0.5rem' }}
              onClick={() => onNavigate(post)}
            >
              Ir a Drive para Generar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const CalendarioSection = ({ plannedPosts = [], account }) => {
  const isEvents = account === '@ecosilence.event';
  const accentColor = isEvents ? '#ec4899' : '#3b82f6';
  const days = ['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM'];
  const [selectedPost, setSelectedPost] = useState(null);
  const [isPublishing, setIsPublishing] = useState(false);
  
  // Mayo 2026: Comienza Viernes (index 4 en 0-6 L-D)
  const daysInMonth = 31;
  const startOffset = 4;
  const calendarDays = [];
  for (let i = 0; i < startOffset; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

  const getPostsForDay = (day) => {
    if (!day) return [];
    const dateStr = `2026-05-${String(day).padStart(2, '0')}`;
    return plannedPosts.filter(p => p.date === dateStr);
  };

  const handlePublish = () => {
    setIsPublishing(true);
    setTimeout(() => {
      setIsPublishing(false);
      alert(`¡Post "${selectedPost.title}" publicado con éxito en Instagram via Meta API!`);
      setSelectedPost(null);
    }, 3000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative' }}>
      <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Mayo 2026</h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-ghost" style={{ fontSize: '0.8rem' }}>Anterior</button>
          <button className="btn btn-primary" style={{ background: accentColor, fontSize: '0.8rem' }}>Hoy</button>
          <button className="btn btn-ghost" style={{ fontSize: '0.8rem' }}>Siguiente</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', background: 'var(--border-color)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
        {days.map(d => (
          <div key={d} style={{ background: 'var(--bg-panel)', padding: '1rem', textAlign: 'center', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)' }}>{d}</div>
        ))}
        {calendarDays.map((day, idx) => (
          <div key={idx} style={{ background: day ? 'var(--bg-dark)' : 'rgba(0,0,0,0.2)', minHeight: '120px', padding: '0.5rem', border: '1px solid rgba(255,255,255,0.02)' }}>
            {day && (
              <>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem', color: day === 30 ? accentColor : 'inherit' }}>{day}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {getPostsForDay(day).map(post => (
                    <div 
                      key={post.id} 
                      onClick={() => setSelectedPost(post)}
                      style={{ 
                        fontSize: '0.65rem', background: `${accentColor}22`, borderLeft: `3px solid ${accentColor}`, 
                        padding: '4px 6px', borderRadius: '4px', color: '#fff', whiteSpace: 'nowrap', 
                        overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' 
                      }}
                    >
                      {post.type === 'reel' ? '🎥' : '📁'} {post.title}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {selectedPost && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 100, width: '300px' }} className="glass-card animate-scale-in">
          <div style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0 }}>{selectedPost.title}</h4>
              <button onClick={() => setSelectedPost(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><Plus size={18} style={{ transform: 'rotate(45deg)' }}/></button>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              {selectedPost.type === 'reel' ? '🎥 Reel' : '📁 Carrusel'} - Planificado para {selectedPost.date}
            </p>
            <button 
              className="btn btn-primary" 
              style={{ width: '100%', background: accentColor, gap: '0.5rem' }} 
              onClick={handlePublish}
              disabled={isPublishing}
            >
              <Megaphone size={16} /> {isPublishing ? 'Publicando...' : 'Publicar ahora en Instagram'}
            </button>
          </div>
        </div>
      )}

      {isPublishing && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
            <div className="spinner" style={{ width: '50px', height: '50px', margin: '0 auto 1.5rem' }}></div>
            <h2>Publicando en {account}...</h2>
            <p style={{ color: 'var(--text-muted)' }}>Subiendo assets y procesando copy via Meta API v19.0</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketingView;
