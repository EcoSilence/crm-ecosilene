import React, { useState } from 'react';
import { useAppStore } from './context/AppDataContext'
import { LayoutDashboard, KanbanSquare, Users, Package, FileText, Settings, LogOut, Search, Bell, Edit2, Menu, X, Folder, FolderOpen, ChevronRight, ChevronDown, CalendarDays, Archive, Megaphone } from 'lucide-react'

import Dashboard from './views/Dashboard'
import KanbanBoard from './views/KanbanBoard'
import ClientesView from './views/ClientesView'
import InventarioView from './views/InventarioView'
import CotizacionesView from './views/CotizacionesView'
import ServiciosListView from './views/ServiciosListView'
import NuevoServicioView from './views/NuevoServicioView'
import MarketingView from './views/MarketingView'
import SettingsView from './views/SettingsView'

function App() {
  const { 
    currentView, navigate, menuNames, updateMenuName, 
    kanbanGroupedData, kanbanExpandedYears, setKanbanExpandedYears, 
    selectedKanbanMonth, setSelectedKanbanMonth, logout, notifications,
    marketingAccounts, selectedMarketingAccount, setSelectedMarketingAccount
  } = useAppStore();
  const [editingMenu, setEditingMenu] = useState(null);
  const [tempName, setTempName] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);

  const monthNames = {
    '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril', '05': 'Mayo', '06': 'Junio',
    '07': 'Julio', '08': 'Agosto', '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre'
  };

  const navigation = [
    { id: 'dashboard', name: menuNames.dashboard || 'Dashboard', icon: LayoutDashboard },
    { id: 'kanban', name: menuNames.kanban || 'Flujo de Trabajo', icon: KanbanSquare },
    { id: 'clientes', name: menuNames.clientes || 'Clientes', icon: Users },
    { id: 'inventario', name: menuNames.inventario || 'Inventario', icon: Package },
    { id: 'cotizaciones', name: menuNames.cotizaciones || 'Cotizaciones', icon: FileText },
    { id: 'marketing', name: menuNames.marketing || 'Marketing & Growth', icon: Megaphone },
    { id: 'archivados', name: menuNames.archivados || 'Archivados sin Aprobar', icon: Archive },
  ]

  const renderView = () => {
    switch(currentView) {
      case 'dashboard': return <Dashboard />
      case 'kanban': return <KanbanBoard />
      case 'clientes': return <ClientesView />
      case 'inventario': return <InventarioView />
      case 'cotizaciones': return <CotizacionesView />
      case 'lista_servicios': return <ServiciosListView />
      case 'archivados': return <ServiciosListView type="archivados" />
      case 'nuevo-servicio': return <NuevoServicioView />
      case 'marketing': return <MarketingView />
      case 'configuracion': return <SettingsView />
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
              <div key={item.id} style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
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
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        setTempName(item.name);
                        setEditingMenu(item.id);
                      }}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.2rem', borderRadius: '4px' }}
                    >
                      <Edit2 size={12} color="var(--text-muted)" style={{ opacity: 0.8 }} />
                    </div>
                  </button>
                )}
                </div>

                {/* Kanban Submenu */}
                {item.id === 'kanban' && currentView === 'kanban' && (
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', paddingLeft: '0.5rem', marginTop: '0.2rem', borderLeft: '2px solid rgba(255,255,255,0.05)', marginLeft: '1rem', marginBottom: '0.5rem' }}>
                      {kanbanGroupedData.sinFecha.length > 0 && (
                        <div 
                          onClick={() => setSelectedKanbanMonth('sinFecha')}
                          style={{ padding: '0.4rem 0.8rem', cursor: 'pointer', borderRadius: '4px', background: selectedKanbanMonth === 'sinFecha' ? 'var(--bg-panel-hover)' : 'transparent', color: selectedKanbanMonth === 'sinFecha' ? 'var(--accent-primary)' : 'var(--text-muted)', display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.85rem' }}
                        >
                          <CalendarDays size={14} /> Sin Fecha ({kanbanGroupedData.sinFecha.length})
                        </div>
                      )}
                      {Object.keys(kanbanGroupedData.years).sort((a,b) => b.localeCompare(a)).map(year => (
                        <div key={year} style={{ display: 'flex', flexDirection: 'column' }}>
                           <div 
                             onClick={() => setKanbanExpandedYears(prev => ({...prev, [year]: !prev[year]}))}
                             style={{ padding: '0.4rem 0.8rem', cursor: 'pointer', borderRadius: '4px', color: kanbanExpandedYears[year] ? 'var(--accent-primary)' : 'var(--text-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', fontWeight: 600 }}
                           >
                             <span style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                               {kanbanExpandedYears[year] ? <FolderOpen size={14} color="var(--accent-primary)"/> : <Folder size={14} color="var(--text-muted)"/>}
                               {year}
                             </span>
                             {kanbanExpandedYears[year] ? <ChevronDown size={14} color="var(--text-muted)"/> : <ChevronRight size={14} color="var(--text-muted)"/>}
                           </div>
                           
                           {kanbanExpandedYears[year] && (
                             <div style={{ display: 'flex', flexDirection: 'column', paddingLeft: '1.2rem', marginTop: '0.2rem', gap: '0.2rem' }}>
                               {Object.keys(kanbanGroupedData.years[year]).sort().reverse().map(month => {
                                 const monthKey = `${year}-${month}`;
                                 const isSelected = selectedKanbanMonth === monthKey;
                                 return (
                                   <div
                                     key={monthKey}
                                     onClick={() => setSelectedKanbanMonth(monthKey)}
                                     style={{ padding: '0.4rem 0.8rem', cursor: 'pointer', borderRadius: '4px', background: isSelected ? 'var(--bg-panel-hover)' : 'transparent', color: isSelected ? 'var(--text-main)' : 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}
                                   >
                                     <span style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                       {isSelected ? <FolderOpen size={14} color="var(--accent-secondary)"/> : <Folder size={14}/>}
                                       {monthNames[month]}
                                     </span>
                                     <span style={{ background: 'var(--bg-dark)', padding: '0.1rem 0.4rem', borderRadius: '10px', fontSize: '0.7rem' }}>
                                       {kanbanGroupedData.years[year][month].length}
                                     </span>
                                   </div>
                                 );
                               })}
                             </div>
                           )}
                        </div>
                      ))}
                   </div>
                )}

                {/* Marketing Submenu */}
                {item.id === 'marketing' && currentView === 'marketing' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', paddingLeft: '0.5rem', marginTop: '0.2rem', borderLeft: '2px solid rgba(255,255,255,0.05)', marginLeft: '1rem', marginBottom: '0.5rem' }}>
                    {(marketingAccounts || []).map(account => {
                      const isSelected = selectedMarketingAccount === account;
                      return (
                        <div
                          key={account}
                          onClick={() => setSelectedMarketingAccount(account)}
                          style={{ 
                            padding: '0.4rem 0.8rem', cursor: 'pointer', borderRadius: '4px', 
                            background: isSelected ? 'var(--bg-panel-hover)' : 'transparent', 
                            color: isSelected ? 'var(--text-main)' : 'var(--text-muted)', 
                            display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem',
                            fontWeight: isSelected ? 600 : 400
                          }}
                        >
                          <Megaphone size={14} color={isSelected ? 'var(--accent-primary)' : 'currentColor'} />
                          {account}
                        </div>
                      );
                    })}
                    <div style={{ padding: '0.4rem 0.8rem', cursor: 'pointer', border: '1px dashed var(--border-color)', borderRadius: '4px', color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.3rem', textAlign: 'center' }}>
                      + Vincular Cuenta
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button 
            className="btn btn-ghost" 
            style={{ justifyContent: 'flex-start', background: currentView === 'configuracion' ? 'var(--bg-panel-hover)' : 'transparent' }}
            onClick={() => navigate('configuracion')}
          >
            <Settings size={18}/> Configuración
          </button>
          <button 
            className="btn btn-ghost" 
            style={{ justifyContent: 'flex-start', color: 'var(--color-tomato)' }}
            onClick={() => { if(confirm('¿Seguro que deseas cerrar sesión?')) logout(); }}
          >
            <LogOut size={18}/> Cerrar Sesión
          </button>
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
            <div style={{ position: 'relative' }}>
              <button 
                className="bell-btn" 
                onClick={() => setShowAlerts(!showAlerts)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', position: 'relative' }}
              >
                <Bell size={22} />
                {notifications.length > 0 && (
                  <span style={{ position: 'absolute', top: -2, right: -2, width: '16px', height: '16px', background: 'var(--color-tomato)', borderRadius: '50%', color: '#fff', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                    {notifications.length}
                  </span>
                )}
              </button>
              
              {showAlerts && notifications.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', right: 0, width: '280px', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '8px', marginTop: '0.8rem', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', zIndex: 1000, padding: '0.5rem' }}>
                  <div style={{ padding: '0.5rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-primary)', borderBottom: '1px solid var(--border-color)', marginBottom: '0.5rem' }}>NOTIFICACIONES</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    {notifications.map(n => (
                      <div key={n.id} style={{ padding: '0.8rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', fontSize: '0.8rem' }}>
                        <div style={{ fontWeight: 600, color: n.type === 'today' ? 'var(--color-tomato)' : 'var(--accent-primary)' }}>{n.title}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{n.text}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
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
