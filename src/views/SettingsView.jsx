import React from 'react';
import { useAppStore } from '../context/AppDataContext';
import { Settings, Shield, Link2, Unlink, LogOut, Info, CheckCircle, AlertCircle } from 'lucide-react';

const SettingsView = () => {
  const { isGoogleLinked, linkGoogle, unlinkGoogle, logout } = useAppStore();

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <Settings size={32} color="var(--accent-primary)" /> Configuración
        </h1>
        <p style={{ color: 'var(--text-muted)', margin: '0.5rem 0 0 0' }}>Administra tu cuenta, integraciones y preferencias del sistema.</p>
      </div>

      <div className="glass-card" style={{ padding: '2rem' }}>
        <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Link2 size={20} color="var(--accent-primary)" /> Integración con Google
        </h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          Conecta tu cuenta de Google para sincronizar automáticamente los servicios con tu Calendario y acceder a los archivos multimedia en Drive.
        </p>

        {isGoogleLinked ? (
          <div style={{ 
            background: 'rgba(16, 185, 129, 0.1)', 
            border: '1px solid var(--color-basil)', 
            borderRadius: 'var(--radius-md)', 
            padding: '1.2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <CheckCircle color="var(--color-basil)" size={24} />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Google está vinculado correctamente</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Calendario y Drive sincronizados</div>
              </div>
            </div>
            <button 
              className="btn btn-ghost" 
              onClick={unlinkGoogle}
              style={{ color: 'var(--color-tomato)', border: '1px solid rgba(255,25,25,0.2)' }}
            >
              <Unlink size={16} /> Desvincular
            </button>
          </div>
        ) : (
          <div style={{ 
            background: 'rgba(255,255,255,0.02)', 
            border: '1px dashed var(--border-color)', 
            borderRadius: 'var(--radius-md)', 
            padding: '1.5rem',
            textAlign: 'center'
          }}>
            <AlertCircle color="var(--text-muted)" size={32} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <div style={{ fontWeight: 500, marginBottom: '1rem' }}>Google no está vinculado</div>
            <button className="btn btn-primary" onClick={linkGoogle}>
              Vincular cuenta de Google
            </button>
          </div>
        )}

        <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: '0.8rem' }}>
          <Info size={16} />
          <span>Si habilitaste recientemente las APIs de Drive, te recomendamos desvincular y volver a vincular para actualizar los permisos.</span>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '2rem' }}>
        <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Shield size={20} color="var(--accent-secondary)" /> Seguridad de la Cuenta
        </h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          Controla el acceso a tu plataforma EcoSilence.
        </p>
        
        <button 
          className="btn btn-ghost" 
          onClick={logout}
          style={{ width: '100%', justifyContent: 'center', color: 'var(--color-tomato)', border: '1px solid rgba(255,25,25,0.1)', padding: '1rem' }}
        >
          <LogOut size={18} /> Cerrar Sesión del CRM
        </button>
      </div>

      <div style={{ textAlign: 'center', opacity: 0.5, fontSize: '0.75rem', marginTop: '2rem' }}>
        EcoSilence CRM v2.4.0 • Desarrollado con tecnología de última generación
      </div>
    </div>
  );
};

export default SettingsView;
