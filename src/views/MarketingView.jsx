import React, { useState, useEffect } from 'react';
import { useAppStore } from '../context/AppDataContext';
import { 
  Megaphone, 
  Layout, 
  Calendar, 
  FileVideo, 
  Image as ImageIcon, 
  Sparkles, 
  TrendingUp, 
  ArrowRight,
  Download,
  Share2,
  MoreVertical,
  Plus,
  PlayCircle,
  Folder,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const MarketingView = () => {
  const { servicios, isGoogleLinked, plannedPosts, addPlannedPost, selectedMarketingAccount, brandProfile } = useAppStore();
  const [activeTab, setActiveTab] = useState('estrategia');
  
  // Estado para la planificación
  const [isPlanningModalOpen, setIsPlanningModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedPlanStep, setSelectedPlanStep] = useState(null);

  const handleOpenPlanning = (file) => {
    setSelectedFile(file);
    setIsPlanningModalOpen(true);
  };

  const stats = [
    { label: 'Leads de Redes', value: brandProfile?.stats.leads || '0', change: '+12%', icon: <TrendingUp size={20}/> },
    { label: 'Contenido Planificado', value: plannedPosts.length.toString(), change: 'En curso', icon: <Calendar size={20}/> },
    { label: 'Tasa de Conversión', value: brandProfile?.stats.conv || '0%', change: '+0.8%', icon: <Sparkles size={20}/> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '3rem', borderTop: '5px solid var(--accent-primary)' }}>
      <div style={{ background: 'var(--accent-primary)', color: '#fff', padding: '0.2rem 1rem', fontSize: '0.7rem', fontWeight: 800 }}>VERSION 3.1 - EXPLORADOR ACTIVO</div>
      {/* Header & Stats */}
      {/* ... (Header content remains same) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <Megaphone size={32} color="var(--accent-primary)" /> Marketing & Automatización 
            <span style={{ fontSize: '1.2rem', color: 'var(--accent-primary)', background: 'rgba(99, 102, 241, 0.1)', padding: '0.2rem 0.8rem', borderRadius: '20px', marginLeft: '0.5rem' }}>
              {selectedMarketingAccount}
            </span>
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: '0.5rem 0 0 0' }}>Gestiona tu contenido, crea estrategias de growth y mide tu embudo de ventas.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          {stats.map((s, i) => (
            <div key={i} className="glass-panel" style={{ padding: '0.8rem 1.2rem', minWidth: '160px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{s.label}</span>
                <span style={{ color: 'var(--accent-primary)' }}>{s.icon}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                <h3 style={{ margin: 0 }}>{s.value}</h3>
                <span style={{ fontSize: '0.7rem', color: s.change.includes('+') ? 'var(--color-basil)' : 'var(--text-muted)' }}>{s.change}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div style={{ 
        display: 'flex', 
        gap: '2rem', 
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '0.5rem'
      }}>
        {[
          { id: 'estrategia', label: 'Estrategia IA', icon: <Sparkles size={18}/> },
          { id: 'drive', label: 'Contenido Drive', icon: <ImageIcon size={18}/> },
          { id: 'plan', label: 'Plan de Accion', icon: <TrendingUp size={18}/> },
          { id: 'calendario', label: 'Calendario Editorial', icon: <Calendar size={18}/> }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{ 
              background: 'none', border: 'none', color: activeTab === tab.id ? 'var(--accent-primary)' : 'var(--text-muted)',
              display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0',
              cursor: 'pointer', fontSize: '0.95rem', fontWeight: activeTab === tab.id ? 600 : 400,
              position: 'relative', transition: 'var(--transition)'
            }}
          >
            {tab.icon} {tab.label}
            {activeTab === tab.id && (
              <div style={{ 
                position: 'absolute', bottom: '-0.5rem', left: 0, right: 0, 
                height: '2px', background: 'var(--accent-gradient)' 
              }} />
            )}
          </button>
        ))}
      </div>

      {/* Main Content Sections */}
      <div style={{ minHeight: '500px' }}>
        {activeTab === 'estrategia' && <EstrategiaSection servicios={servicios} />}
        {activeTab === 'drive' && (
          <DriveSection 
            isLinked={isGoogleLinked} 
            onPlan={handleOpenPlanning}
            onSchedule={addPlannedPost}
            planContext={selectedPlanStep}
            setPlanContext={setSelectedPlanStep}
          />
        )}
        {activeTab === 'plan' && (
          <PlanSection 
            account={selectedMarketingAccount}
            onNavigate={(step) => {
              setSelectedPlanStep(step);
              setActiveTab('drive');
            }} 
          />
        )}
        {activeTab === 'calendario' && <CalendarioSection plannedPosts={plannedPosts} />}
      </div>

      {/* Planning Modal */}
      {isPlanningModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-card animate-scale-in" style={{ width: '100%', maxWidth: '500px', padding: '2rem', position: 'relative' }}>
             <button onClick={() => setIsPlanningModalOpen(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><Plus size={24} style={{ transform: 'rotate(45deg)' }}/></button>
             <h3 style={{ marginTop: 0 }}>Planificar Publicación</h3>
             
             <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '4px', backgroundSize: 'cover', backgroundPosition: 'center', backgroundImage: `url(${selectedFile?.thumb})` }}>
                   {!selectedFile?.thumb && <ImageIcon size={24} color="var(--text-muted)"/>}
                </div>
                <div>
                   <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{selectedFile?.name}</div>
                   <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{selectedFile?.category}</div>
                </div>
             </div>

             <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                   <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Título / Idea del Post</label>
                   <input className="input-control" placeholder="Ej: Reel del montaje en Sheraton" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                   <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Fecha</label>
                      <input type="date" className="input-control" />
                   </div>
                   <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Formato</label>
                      <select className="input-control">
                         <option>Reel</option>
                         <option>Carrusel</option>
                         <option>Post Estático</option>
                         <option>Historia</option>
                      </select>
                   </div>
                </div>
                <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => {
                   alert('Post planificado y añadido al calendario');
                   setIsPlanningModalOpen(false);
                }}>
                   Guardar Planificación
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

const EstrategiaSection = ({ servicios }) => {
  const [selectedEventId, setSelectedEventId] = useState('');
  const [generatedScript, setGeneratedScript] = useState('');
  
  const generateScript = () => {
    const s = servicios.find(srv => srv.idServicio === selectedEventId);
    if (!s) return;
    
    const place = s.direccionEvento || 'un lugar exclusivo';
    const templates = [
      `GANCHO: "¿Por qué nadie está hablando del silencio en los eventos? 🤫\nVALOR: En el evento de ${place}, logramos que 200 personas disfrutaran de una experiencia 100% inmersiva con nuestros audífonos de alta fidelidad. Sin ruido externo, solo conexión.\nCTA: Dale click al link en la bio si quieres elevar tu próximo evento al nivel EcoSilence."`,
      `GANCHO: "El futuro de las conferencias es silencioso... y aquí te muestro por qué. 🎧\nVALOR: Montaje impecable en ${place}. 3 canales de audio simultáneos para que la audiencia elija su idioma o tema preferido. Cero cables, cero complicaciones.\nCTA: Escríbenos 'AUDIO' para recibir una asesoría gratuita."`
    ];
    setGeneratedScript(templates[Math.floor(Math.random() * templates.length)]);
  };

  const recentEvents = servicios.slice(0, 5);
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: 0 }}>
            <Sparkles size={20} color="var(--accent-primary)" /> Generador de Guiones IA
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Selecciona un evento para generar una estructura de Reel optimizada para conversión.</p>
          
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <select 
              className="input-control" 
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              style={{ flex: 1 }}
            >
              <option value="">Seleccionar un evento...</option>
              {recentEvents.map(s => (
                <option key={s.idServicio} value={s.idServicio}>{s.idServicio} - {s.direccionEvento || 'Sin lugar'}</option>
              ))}
            </select>
            <button className="btn btn-primary" onClick={generateScript} disabled={!selectedEventId}>
              <Sparkles size={16} />
            </button>
          </div>

          {generatedScript && (
            <div className="animate-fade-in" style={{ background: 'rgba(0,0,0,0.3)', padding: '1.2rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--accent-primary)', position: 'relative' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', marginBottom: '0.8rem', fontWeight: 800, textTransform: 'uppercase' }}>Script Generado por IA</div>
              <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {generatedScript}
              </p>
              <button 
                onClick={() => navigator.clipboard.writeText(generatedScript)}
                style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                title="Copiar Script"
              >
                <Plus size={14} style={{ transform: 'rotate(45deg)' }} />
              </button>
            </div>
          )}
          
          {!generatedScript && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)' }}>
              <Sparkles size={24} style={{ marginBottom: '0.5rem', opacity: 0.3 }} />
              <p style={{ margin: 0, fontSize: '0.8rem' }}>Elige un evento para empezar</p>
            </div>
          )}
        </div>

        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: 0 }}>
            <TrendingUp size={20} color="var(--color-basil)" /> Pilares de Contenido
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { title: 'Autoridad Técnica', desc: 'Muestra cómo configurar los transmisores y la calidad del audio.', color: '#818cf8' },
              { title: 'Prueba Social', desc: 'Videos de asistentes sonriendo y disfrutando la experiencia silenciosa.', color: '#facc15' },
              { title: 'Lifestyle/Eventos', desc: 'Behind the scenes del montaje en lugares premium.', color: '#f43f5e' }
            ].map((p, i) => (
              <div key={i} style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', borderLeft: `4px solid ${p.color}` }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.title}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{p.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const DriveSection = ({ isLinked, onPlan, onSchedule, planContext, setPlanContext }) => {
  const { listDriveContent } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [path, setPath] = useState([{ id: null, name: 'redes ecosilence' }]);
  const [debugMarker] = useState("v3.1 Explorer Loaded");
  
  // IA Suggestions State
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [selectedCarouselAssets, setSelectedCarouselAssets] = useState([]);

  const fetchContent = async (folderId = null) => {
    setLoading(true);
    setAiSuggestions(null); 
    setSelectedCarouselAssets([]); 
    try {
      const res = await listDriveContent(folderId);
      setFolders(res.folders || []);
      setFiles(res.files || []);
      if (!folderId && res.currentFolderId && path[0].id === null) {
        setPath([{ id: res.currentFolderId, name: 'redes ecosilence' }]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const generateStrategies = () => {
    setIsGenerating(true);
    const folderName = path[path.length - 1].name;
    
    setTimeout(() => {
      const initialImages = files.filter(f => f.type === 'image').slice(0, 4);
      setSelectedCarouselAssets(initialImages);
      const videos = files.filter(f => f.type === 'video').slice(0, 2);
      
      let suggestions = [];
      const isEvents = selectedMarketingAccount === '@ecosilence.event';

      if (planContext) {
        // Generate EXACTLY what the plan asked for with account-aware touch
        suggestions = [{
          id: 'plan_match',
          type: planContext.type,
          title: planContext.title || planContext.idea,
          desc: planContext.goal,
          assets: planContext.type.includes('Carrusel') ? initialImages : (videos.length > 0 ? [videos[0]] : initialImages.slice(0, 1)),
          copy: `GANCHO: ${planContext.title || planContext.idea}\n\nVALOR: ${planContext.message}. En el evento ${folderName} logramos precisamente esto.\n\nCTA: Escribenos para mas informacion. #SilentExperience ${isEvents ? '#PartyMode #EcoSilenceEvent' : '#B2BChile #EventTech'}`
        }];
      } else if (isEvents) {
        // B2C / Party templates
        suggestions = [
          {
            id: 'event_opt_a',
            type: 'Reel Experiencial (Fiesta)',
            title: 'La Magia de la Noche Silent',
            desc: 'Mostrar la vibración, las luces LED y la libertad de bailar.',
            assets: videos.length > 0 ? [videos[0]] : initialImages.slice(0, 1),
            copy: `GANCHO: ¿Buscas la mejor fiesta del año? 🕺✨\n\nVALOR: Con EcoSilence la música no para. 3 canales de pura energía directamente a tus oídos. En ${folderName} la vibra fue total.\n\nCTA: Reserva tu fecha para Silent Party ahora. #SilentParty #EcoSilenceEvent #FiestaSinLimites`
          },
          {
            id: 'event_opt_b',
            type: 'Carrusel de Tips',
            title: 'Libertad de Bailar sin Restricciones',
            desc: 'Educar sobre las ventajas de no hacer ruido externo.',
            assets: initialImages,
            copy: `GANCHO: Olvida los problemas con los vecinos o multas de ruido. 🤫🔥\n\nVALOR: Nuestra tecnologia permite celebrar eventos epicos en cualquier lugar y a cualquier hora. Mira como lo hicimos en ${folderName}.\n\nCTA: Agenda tu Silent Event hoy mismo. #NoNoise #PartyFreedom #Innovacion`
          }
        ];
      } else {
        // Generic B2B templates (Soluciones)
        suggestions = [
          {
            id: 'opt_a',
            type: 'Carrusel Educativo (B2B)',
            title: 'Optimizacion de Audio en Congresos',
            desc: 'Como optimizar el audio en tu proximo congreso corporativo sin ruido ambiental.',
            assets: initialImages,
            copy: `GANCHO: ¿Sabias que el ruido ambiental reduce la retencion de informacion en un 40%? 🧠\n\nVALOR: En el evento de ${folderName}, implementamos tecnologia Silent para que cada asistente escuchara al orador con claridad absoluta.\n\nCTA: Solicita tu cotizacion para eventos corporativos en el link de la bio. #SilentConference #B2BChile #EventosPro`
          },
          {
            id: 'opt_b',
            type: 'Reel de Experiencia',
            title: 'Transformacion Sensorial Corporativa',
            desc: 'Transforma un lanzamiento de producto en una experiencia sensorial inmersiva.',
            assets: videos.length > 0 ? [videos[0]] : initialImages.slice(0, 1),
            copy: `GANCHO: ¿Aburrido de los lanzamientos tradicionales? 😴\n\nVALOR: Creamos experiencias que se escuchan y se sienten. En ${folderName}, logramos una conexion profunda con la marca.\n\nCTA: Escribenos para diseñar tu proxima activacion de marca. #SilentActivation #MarketingExperiencial #Innovacion`
          }
        ];
      }

      setAiSuggestions(suggestions);
      setIsGenerating(false);
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }, 1500);
  };

  const toggleAssetSelection = (file) => {
    if (selectedCarouselAssets.find(a => a.id === file.id)) {
      setSelectedCarouselAssets(prev => prev.filter(a => a.id !== file.id));
    } else {
      if (selectedCarouselAssets.length >= 10) return alert('Máximo 10 imágenes para un carrusel');
      setSelectedCarouselAssets(prev => [...prev, file]);
    }
  };

  const moveAsset = (index, direction) => {
    const newAssets = [...selectedCarouselAssets];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= newAssets.length) return;
    const [movedItem] = newAssets.splice(index, 1);
    newAssets.splice(newIndex, 0, movedItem);
    setSelectedCarouselAssets(newAssets);
  };

  const getSlideMessage = (index, topic = "") => {
    const isEvents = selectedMarketingAccount === '@ecosilence.event';
    const topicLower = topic.toLowerCase();
    
    // MODO EVENTOS (B2C / FIESTA)
    if (isEvents) {
      const partyMessages = [
        "La magia de la Silent Party: Todos bailando al mismo ritmo pero en silencio absoluto.",
        "3 Canales, 3 Ambientes: Del Tech-House al Reggaetón en un solo click.",
        "Sin restricciones: Celebramos hasta el amanecer sin preocuparte por ruidos o vecinos.",
        "Luces LED vibrantes: Tus audífonos son el alma de la fiesta y cambian según el canal.",
        "Calidad Hi-Fi: Beats profundos y voces claras directamente a tus oídos para una noche épica."
      ];
      return partyMessages[index % partyMessages.length];
    }

    // MODO SOLUCIONES (B2B / CORPORATIVO)
    // 5 RAZONES POR LAS QUE EL AUDIO TRADICIONAL ARRUINA TU CONGRESO
    if (topicLower.includes('5 razones') || topicLower.includes('arruina')) {
      const reasons = [
        "1. Eco y Reverberacion: En salones grandes, el rebote del sonido hace que se pierda hasta el 30% del mensaje del orador.",
        "2. Distracciones Externas: El ruido de pasillos o del catering rompe la burbuja de atencion de tus asistentes.",
        "3. Fatiga Auditiva: Forzar el oido para entender entre el ruido cansa a la audiencia y reduce la participacion.",
        "4. Barreras de Idioma: El audio tradicional dificulta la traduccion simultanea nitida sin cabinas costosas.",
        "5. Limitacion de Espacio: No puedes tener dos charlas juntas porque el sonido se cruza. ¡Con EcoSilence si!",
        "La Solucion: Audio inmersivo directo al oido. Control total de la experiencia para un evento impecable."
      ];
      return reasons[index] || reasons[reasons.length - 1];
    }

    // SETUP EN 30 SEGUNDOS / RAPIDEZ
    if (topicLower.includes('setup') || topicLower.includes('rapidez')) {
      const setup = [
        "Paso 1: Encendido instantaneo. Nuestros equipos se sincronizan en segundos sin configuraciones complejas.",
        "Paso 2: Distribucion Higienica. Audifonos listos y desinfectados para cada asistente.",
        "Paso 3: ¡Listo para escuchar! Sin cables, sin parlantes pesados, sin complicaciones tecnicas.",
        "Eficiencia Operativa: Reducimos los tiempos de montaje en un 70% comparado con audio tradicional.",
        "EcoSilence: Tecnologia diseñada para la agilidad que los eventos corporativos de hoy exigen."
      ];
      return setup[index] || setup[setup.length - 1];
    }

    // TECNOLOGIA / 3 CANALES
    if (topicLower.includes('tecnologia') || topicLower.includes('3 canales')) {
      const tech = [
        "Multicanal: 3 frecuencias independientes para tener hasta 3 oradores en el mismo espacio fisico.",
        "Largo Alcance: Hasta 100 metros de cobertura nitida, ideal para grandes centros de convenciones.",
        "Bateria de Larga Duracion: Mas de 10 horas de uso continuo para jornadas intensas de congresos.",
        "Cero Latencia: Sincronizacion perfecta entre labios y audio para una experiencia natural.",
        "Innovacion Chilena: Liderando la transformacion de la industria de eventos en el pais."
      ];
      return tech[index] || tech[tech.length - 1];
    }

    // Default messages
    const messages = [
      "Concentracion total: Nuestra tecnologia elimina las distracciones externas para que tu mensaje sea lo unico que importe.",
      "Claridad absoluta: Audio de alta fidelidad directamente a los oidos de tus asistentes, sin importar la acustica del lugar.",
      "Experiencia Inmersiva: Creamos una burbuja de sonido que conecta a la audiencia con el contenido de forma profunda.",
      "Versatilidad sin cables: Montajes limpios y rapidos para congresos de cualquier escala con EcoSilence Soluciones.",
      "Lleva tu evento al siguiente nivel con nuestras soluciones de audio inmersivo B2B."
    ];
    return messages[index % messages.length];
  };

  useEffect(() => {
    if (isLinked) {
      fetchContent(path[path.length - 1].id);
    }
  }, [isLinked]);

  const navigateTo = (folder) => {
    const newPath = [...path, folder];
    setPath(newPath);
    fetchContent(folder.id);
  };

  const navigateBack = (index) => {
    const newPath = path.slice(0, index + 1);
    setPath(newPath);
    fetchContent(newPath[newPath.length - 1].id);
  };

  if (!isLinked) {
    return (
      <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
        <ImageIcon size={48} color="var(--text-muted)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
        <h3>Google Drive no vinculado</h3>
        <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '0.5rem auto 1.5rem auto' }}>
          Vincula tu cuenta de Google en Configuración para navegar por tus carpetas.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', border: '2px solid var(--accent-primary)', padding: '1.5rem', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.02)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ fontSize: '0.6rem', color: 'var(--accent-primary)', fontWeight: 800, textTransform: 'uppercase' }}>{debugMarker}</div>
          {planContext && (
            <div style={{ background: 'rgba(99, 102, 241, 0.15)', border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <strong>MODO PLAN:</strong> {planContext.week}
              <button onClick={() => setPlanContext(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 800 }}>✕</button>
            </div>
          )}
        </div>
        {path.length > 1 && !loading && (
          <button 
            className="btn btn-primary" 
            onClick={generateStrategies} 
            disabled={isGenerating}
            style={{ borderRadius: 'var(--radius-full)', padding: '0.5rem 1.2rem', gap: '0.6rem', boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)' }}
          >
            <Sparkles size={16} /> {isGenerating ? 'Analizando Contenido...' : 'Generar Estrategia IA'}
          </button>
        )}
      </div>

      {/* Breadcrumbs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
        <Folder size={16} />
        {path.map((p, i) => (
          <React.Fragment key={p.id || 'root'}>
            <button 
              onClick={() => navigateBack(i)}
              style={{ background: 'none', border: 'none', color: i === path.length - 1 ? 'var(--accent-primary)' : 'inherit', cursor: 'pointer', fontWeight: i === path.length - 1 ? 600 : 400, fontSize: '0.85rem' }}
            >
              {p.name}
            </button>
            {i < path.length - 1 && <span>/</span>}
          </React.Fragment>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{path[path.length - 1].name}</h3>
        <button className="btn btn-ghost" onClick={() => fetchContent(path[path.length - 1].id)} disabled={loading} style={{ fontSize: '0.8rem' }}>
          {loading ? 'Cargando...' : 'Actualizar'}
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '5rem', background: 'rgba(0,0,0,0.1)', borderRadius: '12px' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem auto' }}></div>
          <p style={{ color: 'var(--text-muted)' }}>Cargando contenido de Drive...</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Carpetas */}
          {folders.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
              {folders.map(f => (
                <div 
                  key={f.id} 
                  onClick={() => navigateTo(f)}
                  className="folder-item"
                  style={{ 
                    background: 'rgba(255,255,255,0.03)', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: '8px', 
                    padding: '0.8rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    cursor: 'pointer',
                    transition: 'var(--transition)'
                  }}
                >
                  <div style={{ color: 'var(--accent-primary)' }}><Folder size={24} fill="currentColor" fillOpacity={0.2} /></div>
                  <div style={{ fontWeight: 500, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                </div>
              ))}
            </div>
          )}

          {/* Archivos */}
          {files.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem' }}>
              {files.map(file => (
                <div key={file.id} className="drive-item" style={{ 
                  background: 'rgba(255,255,255,0.02)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  position: 'relative'
                }}>
                  <div style={{ 
                    height: '140px', 
                    background: 'var(--bg-panel-hover)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    position: 'relative',
                    backgroundImage: file.thumb ? `url(${file.thumb})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}>
                    {!file.thumb && (file.type === 'video' ? <FileVideo size={40} color="var(--accent-primary)" /> : <ImageIcon size={40} color="var(--color-basil)" />)}
                    {file.type === 'video' && <PlayCircle size={24} style={{ position: 'absolute', bottom: '10px', right: '10px', color: '#fff' }} />}
                    
                    <div className="media-overlay" style={{
                      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                      background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      opacity: 0, transition: 'opacity 0.2s', gap: '0.8rem'
                    }}>
                      {aiSuggestions && file.type === 'image' ? (
                        <button 
                          className={`btn ${selectedCarouselAssets.find(a => a.id === file.id) ? 'btn-primary' : 'btn-ghost'}`} 
                          onClick={() => toggleAssetSelection(file)}
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                        >
                          {selectedCarouselAssets.find(a => a.id === file.id) ? 'Seleccionado' : 'Elegir para Carrusel'}
                        </button>
                      ) : (
                        <>
                          <a href={file.link} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ padding: '0.4rem' }} title="Ver Original"><ArrowRight size={16}/></a>
                          <button className="btn btn-primary" style={{ padding: '0.4rem' }} title="Planificar Post" onClick={() => onPlan(file)}><Plus size={16}/></button>
                        </>
                      )}
                    </div>
                  </div>
                  <div style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                      <div style={{ fontWeight: 500, fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{file.name}</div>
                      {selectedCarouselAssets.find(a => a.id === file.id) && <div style={{ width: '8px', height: '8px', background: 'var(--accent-primary)', borderRadius: '50%' }}></div>}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                      <span>{file.date}</span>
                      <span>{file.size}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            !loading && folders.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem', background: 'rgba(255,255,255,0.01)', borderRadius: '12px' }}>Esta carpeta esta vacia.</div>
          )}
        </div>
      )}

      {/* IA SUGGESTIONS RENDERER */}
      {aiSuggestions && (
        <div className="animate-fade-in" style={{ marginTop: '3rem', borderTop: '2px dashed var(--accent-primary)', paddingTop: '3rem' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
            <Sparkles color="var(--accent-primary)" size={28} /> Estrategia de Contenido Propuesta
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
            {aiSuggestions.map((s, idx) => (
              <div key={idx} className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '0.7rem', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-primary)', padding: '0.2rem 0.6rem', borderRadius: '4px', fontWeight: 700 }}>{s.type}</span>
                  <Plus size={18} color="var(--text-muted)" style={{ cursor: 'pointer' }} />
                </div>
                <h4 style={{ margin: 0 }}>{s.title}</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>{s.desc}</p>
                
                {/* Carrusel Interactive Preview */}
                {s.type.includes('Carrusel') ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.8rem', overflowX: 'auto', padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)', minHeight: '100px' }}>
                      {selectedCarouselAssets.map((asset, aidx) => (
                        <div key={aidx} style={{ position: 'relative', minWidth: '110px', height: '110px', borderRadius: '8px', backgroundSize: 'cover', backgroundImage: `url(${asset.thumb})`, border: '2px solid var(--accent-primary)', transition: 'all 0.3s ease' }}>
                           <button 
                            onClick={() => toggleAssetSelection(asset)}
                            style={{ position: 'absolute', top: '-5px', right: '-5px', width: '22px', height: '22px', borderRadius: '50%', background: 'var(--color-tomato)', border: 'none', color: '#fff', fontSize: '10px', cursor: 'pointer', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title="Eliminar"
                           >
                            ✕
                           </button>

                           <div style={{ position: 'absolute', bottom: '0', left: '0', right: '0', background: 'rgba(0,0,0,0.8)', color: '#fff', fontSize: '0.65rem', padding: '4px', textAlign: 'center', fontWeight: 600 }}>Slide {aidx + 1}</div>
                           
                           {/* Move Controls */}
                           <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, transform: 'translateY(-50%)', display: 'flex', justifyContent: 'space-between', padding: '0 4px', opacity: 0.8 }}>
                              {aidx > 0 && (
                                <button onClick={(e) => { e.stopPropagation(); moveAsset(aidx, -1); }} style={{ background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '4px', color: '#fff', padding: '2px', cursor: 'pointer' }}>
                                  <ChevronLeft size={14} />
                                </button>
                              )}
                              <div style={{ flex: 1 }}></div>
                              {aidx < selectedCarouselAssets.length - 1 && (
                                <button onClick={(e) => { e.stopPropagation(); moveAsset(aidx, 1); }} style={{ background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '4px', color: '#fff', padding: '2px', cursor: 'pointer' }}>
                                  <ChevronRight size={14} />
                                </button>
                              )}
                           </div>
                        </div>
                      ))}
                      {selectedCarouselAssets.length === 0 && <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', border: '1px dashed var(--border-color)', borderRadius: '8px' }}>Selecciona fotos arriba ⬆️</div>}
                    </div>
                    
                    {/* Slide Messages */}
                    {selectedCarouselAssets.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent-primary)' }}>MENSAJES POR DIAPOSITIVA:</div>
                        {selectedCarouselAssets.slice(0, 5).map((_, aidx) => (
                          <div key={aidx} style={{ padding: '0.6rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', fontSize: '0.75rem', borderLeft: '2px solid var(--accent-primary)' }}>
                             <strong>Slide {aidx + 1}:</strong> {getSlideMessage(aidx, s.title)}
                          </div>
                        ))}
                        {selectedCarouselAssets.length > 3 && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center' }}>+ {selectedCarouselAssets.length - 3} diapositivas mas...</div>}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', padding: '0.5rem 0' }}>
                    {s.assets.map((asset, aidx) => (
                      <div key={aidx} style={{ minWidth: '80px', height: '80px', borderRadius: '8px', backgroundSize: 'cover', backgroundImage: `url(${asset.thumb})`, border: '1px solid var(--border-color)' }}>
                        {!asset.thumb && <ImageIcon size={20} color="var(--text-muted)" />}
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.85rem', position: 'relative' }}>
                  <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{s.copy}</p>
                  <button 
                    onClick={() => navigator.clipboard.writeText(s.copy)}
                    style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                  >
                    <Plus size={14} style={{ transform: 'rotate(45deg)' }} />
                  </button>
                </div>
                
                <button 
                  className="btn btn-primary" 
                  style={{ width: '100%', marginTop: 'auto' }} 
                  onClick={() => {
                    const newPost = {
                      id: Date.now(),
                      title: s.title,
                      type: s.type.toLowerCase().includes('reel') ? 'reel' : 'carousel',
                      date: new Date(2026, 4, 1 + (planContext ? (parseInt(planContext.week.match(/\d/)[0]) - 1) * 7 + (planContext.week.includes('Post 2') ? 3 : 0) : 5)).toISOString().split('T')[0],
                      copy: s.copy,
                      assets: s.id === 'plan_match' ? selectedCarouselAssets : s.assets
                    };
                    onSchedule(newPost);
                    alert(`¡Post "${s.title}" planificado con éxito para el ${newPost.date}!`);
                  }}
                >
                  Planificar Publicacion
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .folder-item:hover { background: rgba(255,255,255,0.08) !important; transform: translateY(-2px); border-color: var(--accent-primary) !important; }
        .drive-item:hover .media-overlay { opacity: 1 !important; }
        @keyframes fade-in { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.5s ease forwards; }
      `}</style>
    </div>
  );
};

const CalendarioSection = ({ plannedPosts = [] }) => {
  const days = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];
  
  const getPostsForDay = (dayNum) => {
    const dateStr = `2026-05-${String(dayNum).padStart(2, '0')}`;
    return plannedPosts.filter(p => p.date === dateStr);
  };

  return (
    <div className="glass-card" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: 0 }}>Planificacion Mayo 2026</h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-ghost" style={{ padding: '0.4rem 0.8rem' }}>Semana</button>
          <button className="btn btn-primary" style={{ padding: '0.4rem 0.8rem' }}>Mes</button>
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', background: 'var(--border-color)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        {days.map(d => (
          <div key={d} style={{ background: 'var(--bg-dark)', padding: '0.8rem', textAlign: 'center', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>{d}</div>
        ))}
        {Array.from({ length: 28 }).map((_, i) => {
          const dayNum = i + 1;
          const posts = getPostsForDay(dayNum);
          return (
            <div key={i} style={{ background: 'var(--bg-dark)', minHeight: '100px', padding: '0.5rem', position: 'relative' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{dayNum}</span>
              {posts.map(p => (
                <div key={p.id} style={{ 
                  background: p.type === 'reel' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(16, 185, 129, 0.2)', 
                  borderLeft: `3px solid ${p.type === 'reel' ? '#6366f1' : '#10b981'}`, 
                  padding: '0.3rem', fontSize: '0.65rem', marginTop: '0.3rem', borderRadius: '2px',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }}>
                  {p.type === 'reel' ? '🎬' : '📸'} {p.title}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const PlanSection = ({ onNavigate }) => {
  const steps = [
    {
      week: 'SEMANA 1 - Post 1',
      type: 'Carrusel Educativo',
      goal: 'Educar sobre el problema del ruido.',
      idea: '5 razones por las que el audio tradicional arruina tu congreso.',
      message: 'En EcoSilence no solo damos audifonos, resolvemos la contaminacion acustica.',
      action: 'Usa fotos de asistentes concentrados y graficos.'
    },
    {
      week: 'SEMANA 1 - Post 2',
      type: 'Reel Tactico',
      goal: 'Mostrar la facilidad de uso.',
      idea: 'Setup en 30 segundos: La rapidez de EcoSilence.',
      message: 'Sin cables, sin interferencias. Montaje rapido para eventos de alto nivel.',
      action: 'Graba un time-lapse del montaje de los audifonos.'
    },
    {
      week: 'SEMANA 2 - Post 1',
      type: 'Caso de Exito',
      goal: 'Prueba Social B2B.',
      idea: 'Estudio de Caso: [Nombre del Cliente] - 3 salas simultaneas.',
      message: 'Eficiencia espacial maxima. 3 conferencias en el mismo salon.',
      action: 'Usa el generador IA con fotos de un evento real.'
    },
    {
      week: 'SEMANA 2 - Post 2',
      type: 'Testimonio Visual',
      goal: 'Generar confianza.',
      idea: 'Lo que dicen los oradores sobre EcoSilence.',
      message: '"La claridad del audio me permitio conectar con mi publico como nunca antes".',
      action: 'Foto de un orador con audifonos y el texto del testimonio.'
    },
    {
      week: 'SEMANA 3 - Post 1',
      type: 'Reel Emocional',
      goal: 'Mostrar la experiencia del usuario.',
      idea: 'La reaccion al ponerse los audifonos por primera vez.',
      message: 'Ese momento de silencio total donde solo importa la voz del experto.',
      action: 'Video corto de asistentes sonriendo al encender sus equipos.'
    },
    {
      week: 'SEMANA 3 - Post 2',
      type: 'Carrusel Tecnico',
      goal: 'Explicar el valor diferencial.',
      idea: '¿Como funciona la tecnologia Silent de EcoSilence?',
      message: '3 canales de audio, largo alcance y cero latencia. Tecnologia de punta.',
      action: 'Fotos de detalle de los transmisores y audifonos.'
    },
    {
      week: 'SEMANA 4 - Post 1',
      type: 'Caso de Exito',
      goal: 'Reforzar autoridad.',
      idea: 'Evento Corporativo: [Marca X] - Experiencia Inmersiva.',
      message: 'Llevamos la marca a un nivel superior con audio personalizado.',
      action: 'Usa el generador IA con una carpeta de activacion de marca.'
    },
    {
      week: 'SEMANA 4 - Post 2',
      type: 'Post de Conversion',
      goal: 'Generar leads.',
      idea: '¿Listo para tu proximo evento corporativo?',
      message: 'Agenda una demo tecnica hoy mismo. Somos tu partner estrategico.',
      action: 'Imagen de alta calidad del equipo EcoSilence con CTA claro.'
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="glass-card" style={{ padding: '2rem', borderLeft: '5px solid var(--accent-primary)', background: 'linear-gradient(90deg, rgba(99, 102, 241, 0.1) 0%, transparent 100%)' }}>
        <h2 style={{ marginTop: 0 }}>Plan de Accion: Dominio B2B (8 Posts/Mes)</h2>
        <p style={{ color: 'var(--text-muted)' }}>Hemos duplicado la frecuencia para acelerar tu posicionamiento. Este plan alterna educacion, prueba social y experiencia inmersiva.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {steps.map((s, i) => (
          <div key={i} className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid rgba(255,255,255,0.05)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, right: 0, width: '4px', height: '100%', background: i % 2 === 0 ? 'var(--accent-primary)' : 'var(--accent-secondary)' }}></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--accent-primary)' }}>{s.week}</span>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.7rem' }}>{s.type}</div>
            </div>
            <h3 style={{ margin: 0, fontSize: '1rem', lineHeight: 1.4 }}>{s.idea}</h3>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', borderLeft: '2px solid var(--border-color)', paddingLeft: '1rem', fontStyle: 'italic' }}>
              "{s.message}"
            </div>
            <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', fontSize: '0.75rem' }}>
              <span style={{ fontWeight: 600, color: 'var(--color-basil)' }}>Accion:</span> {s.action}
            </div>
            <button 
              className="btn btn-ghost" 
              onClick={() => onNavigate(s)}
              style={{ width: '100%', border: '1px dashed var(--border-color)', fontSize: '0.8rem' }}
            >
              Ir a Drive para seleccionar contenido
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MarketingView;
