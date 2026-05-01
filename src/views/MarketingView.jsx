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

const PlanSection = ({ onNavigate, account }) => (
  <div style={{ display: 'grid', gap: '1rem' }}>
    <h3>Plan de Accion - {account}</h3>
    <button className="btn btn-ghost" onClick={() => onNavigate({ week: 'SEMANA 1', idea: 'Post de Prueba', goal: 'Test' })}>Post de Prueba (Ir a Drive)</button>
  </div>
);

const CalendarioSection = ({ plannedPosts }) => (
  <div className="glass-card" style={{ padding: '2rem' }}>
    <h3>Calendario</h3>
    {plannedPosts.map(p => <div key={p.id}>{p.date} - {p.title}</div>)}
  </div>
);

export default MarketingView;
