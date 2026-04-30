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
  PlayCircle
} from 'lucide-react';

const MarketingView = () => {
  const { servicios, isGoogleLinked, listDriveFiles } = useAppStore();
  const [activeTab, setActiveTab] = useState('estrategia');
  const [loadingDrive, setLoadingDrive] = useState(false);
  const [driveFiles, setDriveFiles] = useState([]);

  useEffect(() => {
    if (activeTab === 'drive' && isGoogleLinked && driveFiles.length === 0) {
      fetchDriveContent();
    }
  }, [activeTab, isGoogleLinked]);

  const fetchDriveContent = async () => {
    setLoadingDrive(true);
    const files = await listDriveFiles('redes ecosilence');
    setDriveFiles(files);
    setLoadingDrive(false);
  };

  const stats = [
    { label: 'Leads de Redes', value: '24', change: '+12%', icon: <TrendingUp size={20}/> },
    { label: 'Contenido Planificado', value: '8', change: 'En curso', icon: <Calendar size={20}/> },
    { label: 'Tasa de Conversión', value: '4.5%', change: '+0.8%', icon: <Sparkles size={20}/> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '3rem' }}>
      {/* Header & Stats */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <Megaphone size={32} color="var(--accent-primary)" /> Marketing & Automatización
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
          { id: 'calendario', label: 'Calendario Editorial', icon: <Calendar size={18}/> },
          { id: 'funnel', label: 'Embudo de Ventas', icon: <TrendingUp size={18}/> }
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
            files={driveFiles} 
            loading={loadingDrive} 
            isLinked={isGoogleLinked} 
            onRetry={fetchDriveContent}
          />
        )}
        {activeTab === 'calendario' && <CalendarioSection />}
        {activeTab === 'funnel' && <FunnelSection />}
      </div>
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

const DriveSection = ({ files, loading, isLinked, onRetry }) => {
  if (!isLinked) {
    return (
      <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
        <ImageIcon size={48} color="var(--text-muted)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
        <h3>Google Drive no vinculado</h3>
        <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '0.5rem auto 1.5rem auto' }}>
          Vincula tu cuenta de Google para acceder a las carpetas de tus eventos y automatizar la creación de contenido.
        </p>
        <button className="btn btn-primary" onClick={() => alert('Ve a Configuración para vincular Google')}>
          Vincular Google Drive
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="glass-card" style={{ padding: '4rem', textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 1rem auto' }}></div>
        <p>Sincronizando con Google Drive...</p>
      </div>
    );
  }

  return (
    <div className="glass-card" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h3 style={{ margin: 0 }}>Explorador de Multimedia (Google Drive)</h3>
        <button className="btn btn-ghost" style={{ fontSize: '0.85rem' }} onClick={onRetry}>
          <Download size={16} /> Sincronizar Carpeta
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem' }}>
        {files.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <p>No se encontraron archivos en la carpeta 'EcoSilence Eventos'.</p>
          </div>
        ) : (
          files.map(file => (
            <a key={file.id} href={file.link} target="_blank" rel="noreferrer" className="drive-item" style={{ 
              background: 'rgba(255,255,255,0.02)', 
              border: '1px solid var(--border-color)', 
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              transition: 'var(--transition)',
              cursor: 'pointer',
              textDecoration: 'none',
              color: 'inherit'
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
              </div>
              <div style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                   <span style={{ 
                     fontSize: '0.65rem', 
                     background: 'rgba(255,255,255,0.1)', 
                     padding: '0.1rem 0.4rem', 
                     borderRadius: '4px',
                     color: 'var(--accent-primary)',
                     textTransform: 'uppercase',
                     fontWeight: 700
                   }}>
                     {file.category}
                   </span>
                </div>
                <div style={{ fontWeight: 500, fontSize: '0.85rem', marginBottom: '0.3rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  <span>{file.date}</span>
                  <span>{file.size}</span>
                </div>
              </div>
            </a>
          ))
        )}
      </div>
    </div>
  );
};

const CalendarioSection = () => {
  const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  return (
    <div className="glass-card" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: 0 }}>Planificación Mayo 2026</h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-ghost" style={{ padding: '0.4rem 0.8rem' }}>Semana</button>
          <button className="btn btn-primary" style={{ padding: '0.4rem 0.8rem' }}>Mes</button>
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', background: 'var(--border-color)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        {days.map(d => (
          <div key={d} style={{ background: 'var(--bg-dark)', padding: '0.8rem', textAlign: 'center', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>{d}</div>
        ))}
        {Array.from({ length: 28 }).map((_, i) => (
          <div key={i} style={{ background: 'var(--bg-dark)', minHeight: '100px', padding: '0.5rem', position: 'relative' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{i + 1}</span>
            {i === 4 && <div style={{ background: 'rgba(99, 102, 241, 0.2)', borderLeft: '3px solid #6366f1', padding: '0.3rem', fontSize: '0.7rem', marginTop: '0.3rem', borderRadius: '2px' }}>🎬 Reel: Caso Marriott</div>}
            {i === 10 && <div style={{ background: 'rgba(16, 185, 129, 0.2)', borderLeft: '3px solid #10b981', padding: '0.3rem', fontSize: '0.7rem', marginTop: '0.3rem', borderRadius: '2px' }}>📸 Carrusel: Beneficios Silent</div>}
          </div>
        ))}
      </div>
    </div>
  );
};

const FunnelSection = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginTop: 0 }}>Rendimiento del Embudo</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '2rem' }}>
            {[
              { label: 'Atracción (Impresiones)', value: '45.2K', color: '#6366f1', width: '100%' },
              { label: 'Interés (Clics en Link)', value: '1.8K', color: '#818cf8', width: '60%' },
              { label: 'Deseo (Solicitud Cotización)', value: '142', color: '#a5b4fc', width: '30%' },
              { label: 'Acción (Clientes Cerrados)', value: '12', color: '#c7d2fe', width: '10%' }
            ].map((s, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                  <span>{s.label}</span>
                  <strong>{s.value}</strong>
                </div>
                <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: s.width, background: s.color }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginTop: 0 }}>Landing Pages Activas</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { name: 'Campaña Silent Cinema Verano', leads: 45, conversion: '5.2%' },
              { name: 'Conferencias B2B - LinkedIn', leads: 12, conversion: '3.1%' }
            ].map((lp, i) => (
              <div key={i} style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{lp.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{lp.leads} leads • {lp.conversion} conv.</div>
                </div>
                <button className="btn btn-ghost" style={{ padding: '0.4rem' }}><ArrowRight size={18} /></button>
              </div>
            ))}
            <button className="btn btn-ghost" style={{ marginTop: '0.5rem', border: '1px dashed var(--border-color)' }}>
              + Crear Nueva Landing Page
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketingView;
