import React, { useState } from 'react';
import { useAppStore } from './context/AppDataContext'
import { LayoutDashboard, KanbanSquare, Users, Package, FileText, Settings, LogOut, Search, Bell, Edit2, Menu, X } from 'lucide-react'

import Dashboard from './views/Dashboard'
import KanbanBoard from './views/KanbanBoard'
import ClientesView from './views/ClientesView'
import InventarioView from './views/InventarioView'
import CotizacionesView from './views/CotizacionesView'

function App() {
  const { currentView, navigate, menuNames, updateMenuName } = useAppStore();
  const [editingMenu, setEditingMenu] = useState(null);
  const [tempName, setTempName] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigation = [
    { id: 'dashboard', name: menuNames.dashboard || 'Dashboard', icon: LayoutDashboard },
    { id: 'kanban', name: menuNames.kanban || 'Flujo de Trabajo', icon: KanbanSquare },
    { id: 'clientes', name: menuNames.clientes || 'Clientes', icon: Users },
    { id: 'inventario', name: menuNames.inventario || 'Inventario', icon: Package },
    { id: 'cotizaciones', name: menuNames.cotizaciones || 'Cotizaciones', icon: FileText },
  ]

  const renderView = () => {
    switch(currentView) {
      case 'dashboard': return <Dashboard />
      case 'kanban': return <KanbanBoard />
      case 'clientes': return <ClientesView />
      case 'inventario': return <InventarioView />
      case 'cotizaciones': return <CotizacionesView />
      default: return <Dashboard />
    }
  }

  return (
    <div className={`app-container ${isMobileMenuOpen ? 'mobile-menu-open' : ''}`}>
      <div 
        className="mobile-overlay" 
        onClick={() => setIsMobileMenuOpen(false)}
        style={{ display: isMobileMenuOpen ? 'block' : 'none' }}
      ></div>
      <aside className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
        <div style={{ padding: '0.5rem 0 2rem 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem', color: '#fff' }}>
            ES
          </div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: '700', letterSpacing: '1px' }}>
            ECO<span style={{ color: 'var(--accent-primary)' }}>SILENCE</span>
          </h2>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Menu Principal
          </p>
          {navigation.map((item) => {
            const isActive = currentView === item.id;
            const isEditing = editingMenu === item.id;
            
            return (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center' }}>
                {isEditing ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px', padding: '0.6rem 1rem', background: 'var(--bg-panel-hover)', borderRadius: 'var(--radius-sm)' }}>
                     <item.icon size={20} color="var(--accent-primary)" />
                     <input 
                        autoFocus
                        className="input-control" 
                        style={{ padding: '0.2rem 0.5rem', flex: 1, fontSize: '0.95rem' }} 
                        value={tempName} 
                        onChange={e => setTempName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { updateMenuName(item.id, tempName); setEditingMenu(null); }
                          else if (e.key === 'Escape') setEditingMenu(null);
                        }}
                        onBlur={() => { updateMenuName(item.id, tempName); setEditingMenu(null); }}
                     />
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      navigate(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    title="Doble clic para renombrar"
                    onDoubleClick={() => {
                        setTempName(item.name);
                        setEditingMenu(item.id);
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px', padding: '0.8rem 1rem', flex: 1,
                      borderRadius: 'var(--radius-sm)', background: isActive ? 'var(--bg-panel-hover)' : 'transparent',
                      color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
                      border: '1px solid', borderColor: isActive ? 'var(--border-color)' : 'transparent',
                      cursor: 'pointer', transition: 'var(--transition)', textAlign: 'left',
                      fontSize: '0.95rem', fontWeight: isActive ? 600 : 500, outline: 'none'
                    }}
                  >
                    <item.icon size={20} color={isActive ? 'var(--accent-primary)' : 'currentColor'} />
                    <span style={{ flex: 1 }}>{item.name}</span>
                    <Edit2 size={12} color="var(--text-muted)" style={{ opacity: 0.3 }} />
                  </button>
                )}
              </div>
            )
          })}
        </nav>

        <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button className="btn btn-ghost" style={{ justifyContent: 'flex-start' }}><Settings size={18}/> Configuración</button>
          <button className="btn btn-ghost" style={{ justifyContent: 'flex-start', color: 'var(--color-tomato)' }}><LogOut size={18}/> Cerrar Sesión</button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button 
            className="mobile-menu-toggle"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            style={{ display: 'none', background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', padding: '0.5rem' }}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
            <div style={{ position: 'relative', width: '300px' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                placeholder="Buscar clientes, equipos, servicios..." 
                className="input-control" 
                style={{ width: '100%', paddingLeft: '2.5rem', borderRadius: 'var(--radius-full)', background: 'var(--bg-dark)' }} 
              />
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <button className="bell-btn" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', position: 'relative' }}>
              <Bell size={22} />
              <span style={{ position: 'absolute', top: 0, right: 0, width: '8px', height: '8px', background: 'var(--color-tomato)', borderRadius: '50%' }}></span>
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderLeft: '1px solid var(--border-color)', paddingLeft: '1.5rem' }}>
            <div className="text-right" style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>Administrador</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>admin@ecosilence.cl</p>
              </div>
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold' }}>
                A
              </div>
            </div>
          </div>
        </header>

        <div className="content-scroll">
          <div className="animate-fade-in">
            {renderView()}
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
