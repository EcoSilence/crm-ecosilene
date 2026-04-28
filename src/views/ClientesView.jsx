import React, { useState } from 'react';
import { useAppStore } from '../context/AppDataContext';
import { Plus, Search, MapPin, Phone, Building, Mail, X, Trash2, Edit2, Upload, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

const ClientesView = () => {
  const { clientes, addCliente, editCliente, removeCliente, menuNames } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    id: '', nombre: '', apellido: '', correo: '', telefono: '', direccionEmpresa: '', comuna: '', pais: 'Chile', empresa: '', cargo: '', tipoEvento: 'Conferencia'
  });

  // Import State
  const [importData, setImportData] = useState({ headers: [], rows: [] });
  const [fieldMapping, setFieldMapping] = useState({});
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);

  const targetFields = [
    { key: 'nombre', label: 'Nombre' },
    { key: 'apellido', label: 'Apellido' },
    { key: 'correo', label: 'Correo Electrónico' },
    { key: 'telefono', label: 'Teléfono' },
    { key: 'empresa', label: 'Empresa' },
    { key: 'cargo', label: 'Cargo' },
    { key: 'tipoEvento', label: 'Tipo Evento' },
    { key: 'direccionEmpresa', label: 'Dirección' }
  ];

  const openNewModal = () => {
    setEditMode(false);
    setFormData({ id: '', nombre: '', apellido: '', correo: '', telefono: '', direccionEmpresa: '', comuna: '', pais: 'Chile', empresa: '', cargo: '', tipoEvento: 'Conferencia' });
    setIsModalOpen(true);
  };

  const openEditModal = (cliente) => {
    setEditMode(true);
    setFormData({ ...cliente });
    setIsModalOpen(true);
  };

  const filteredClientes = clientes.filter(c => 
    c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.empresa.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.correo && c.correo.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editMode) {
      editCliente(formData.id, formData);
    } else {
      addCliente(formData);
    }
    setIsModalOpen(false);
  };

  const handleExport = (format) => {
    if (clientes.length === 0) return alert('No hay clientes para exportar');
    
    const exportData = clientes.map(c => ({
      ID: c.id,
      Nombre: c.nombre,
      Apellido: c.apellido,
      Correo: c.correo,
      Teléfono: c.telefono,
      Empresa: c.empresa,
      Cargo: c.cargo,
      'Tipo de Evento': c.tipoEvento,
      Dirección: c.direccionEmpresa,
      Comuna: c.comuna,
      País: c.pais
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Clientes");

    if (format === 'csv') {
      XLSX.writeFile(wb, "Directorio_Clientes_EcoSilence.csv");
    } else {
      XLSX.writeFile(wb, "Directorio_Clientes_EcoSilence.xlsx");
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

      if (data.length < 2) return alert('El archivo está vacío o no tiene encabezados válidos.');

      const headers = data[0].map(h => String(h || '')); 
      const rows = data.slice(1).filter(r => r && r.length > 0);
      
      setImportData({ headers, rows });
      
      // Auto-map if headers match slightly
      const autoMap = {};
      targetFields.forEach(tf => {
        const foundIndex = headers.findIndex(h => h.toLowerCase().includes(tf.label.toLowerCase()) || h.toLowerCase().includes(tf.key.toLowerCase()));
        if(foundIndex !== -1) autoMap[tf.key] = foundIndex;
      });
      setFieldMapping(autoMap);
      setIsMappingModalOpen(true);
    };
    reader.readAsBinaryString(file);
    e.target.value = ''; // Reset
  };

  const processImport = () => {
    const { headers, rows } = importData;
    let imported = 0;
    let updated = 0;

    rows.forEach(row => {
      const newCli = { pais: 'Chile', comuna: '' };
      
      targetFields.forEach(tf => {
        const mappedHeaderIndex = fieldMapping[tf.key];
        if (mappedHeaderIndex !== undefined && mappedHeaderIndex !== '') {
          newCli[tf.key] = row[mappedHeaderIndex] ? String(row[mappedHeaderIndex]).trim() : '';
        } else {
          newCli[tf.key] = '';
        }
      });

      if (!newCli.nombre && !newCli.correo) return;

      const existingClient = newCli.correo ? clientes.find(c => c.correo && c.correo.toLowerCase() === newCli.correo.toLowerCase()) : null;
      
      if (existingClient) {
        editCliente(existingClient.id, { ...existingClient, ...newCli, nombre: newCli.nombre || existingClient.nombre });
        updated++;
      } else {
        addCliente(newCli);
        imported++;
      }
    });

    setIsMappingModalOpen(false);
    alert(`Importación completada:\n✅ ${imported} clientes agregados\n🔄 ${updated} clientes actualizados.`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ marginBottom: '0.5rem' }}>{menuNames.clientes || 'Directorio de Clientes'}</h1>
          <p style={{ color: 'var(--text-muted)' }}>Gestiona tu base de datos de clientes y empresas.</p>
        </div>
        <div className="responsive-flex-column" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <label className="btn btn-ghost" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', justifyContent: 'center' }}>
            <Upload size={16} /> Importar Excel
            <input type="file" accept=".xlsx, .xls, .csv" style={{ display: 'none' }} onChange={handleFileUpload} />
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => handleExport('xlsx')}><Download size={16} /> Excel</button>
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => handleExport('csv')}><Download size={16} /> CSV</button>
          </div>
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={openNewModal}><Plus size={18} /> Nuevo Cliente</button>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', width: '100%', maxWidth: '300px' }}>
          <div className="input-group" style={{ margin: 0, width: '100%', position: 'relative' }}>
             <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
             <input 
               type="text" 
               className="input-control" 
               placeholder="Buscar por cliente, correo o empresa..." 
               style={{ paddingLeft: '2.2rem' }}
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
             />
          </div>
        </div>

        <div style={{ overflowX: 'auto', maxHeight: '70vh', position: 'relative' }}>
          <table className="sticky-header" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '1rem' }}>Empresa / Tipo</th>
                <th style={{ padding: '1rem' }}>Cliente</th>
                <th style={{ padding: '1rem' }}>Contacto (Mail & Tel)</th>
                <th style={{ padding: '1rem' }}>Ubicación Comercial</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredClientes.map((c) => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'var(--transition)' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
                        <Building size={14} color="var(--accent-primary)" /> {c.empresa || 'Sin empresa'}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{c.cargo} • {c.tipoEvento}</span>
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 600 }}>{c.nombre} {c.apellido}</div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Mail size={14} /> {c.correo || '—'}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Phone size={14} /> {c.telefono || '—'}</span>
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)' }}>
                      <MapPin size={14} />
                      {c.direccionEmpresa}, {c.comuna}
                    </div>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                      <button className="btn btn-ghost" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', color: 'var(--text-muted)' }} onClick={() => openEditModal(c)}>
                        <Edit2 size={16} />
                      </button>
                      <button className="btn btn-ghost" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', color: 'var(--color-tomato)' }} onClick={() => { if(window.confirm(`¿Estás seguro de que deseas borrar a ${c.nombre} ${c.apellido} del directorio?`)) removeCliente(c.id) }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredClientes.length === 0 && (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No se encontraron clientes.</div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 9999 }}>
           <div className="modal-content" style={{ margin: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                 <h2 style={{ margin: 0, fontSize: '1.3rem' }}>Registrar Nuevo Cliente</h2>
                 <button className="btn btn-ghost" style={{ padding: '0.4rem', border: 'none' }} onClick={() => setIsModalOpen(false)}>
                    <X size={20} />
                 </button>
              </div>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                 <div style={{ display: 'flex', gap: '1rem' }}>
                   <div className="input-group" style={{ flex: 1, margin: 0 }}>
                     <label className="input-label">Nombre</label>
                     <input required type="text" className="input-control" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
                   </div>
                   <div className="input-group" style={{ flex: 1, margin: 0 }}>
                     <label className="input-label">Apellido</label>
                     <input required type="text" className="input-control" value={formData.apellido} onChange={e => setFormData({...formData, apellido: e.target.value})} />
                   </div>
                 </div>
                 
                 <div className="input-group" style={{ margin: 0 }}>
                   <label className="input-label">Correo Electrónico</label>
                   <input required type="email" className="input-control" value={formData.correo} onChange={e => setFormData({...formData, correo: e.target.value})} />
                 </div>

                 <div className="input-group" style={{ margin: 0 }}>
                   <label className="input-label">Teléfono</label>
                   <input required type="text" className="input-control" placeholder="+569..." value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} />
                 </div>

                 <div style={{ display: 'flex', gap: '1rem' }}>
                   <div className="input-group" style={{ flex: 2, margin: 0 }}>
                     <label className="input-label">Empresa</label>
                     <input type="text" className="input-control" value={formData.empresa} onChange={e => setFormData({...formData, empresa: e.target.value})} />
                   </div>
                   <div className="input-group" style={{ flex: 1, margin: 0 }}>
                     <label className="input-label">Cargo</label>
                     <input type="text" className="input-control" value={formData.cargo} onChange={e => setFormData({...formData, cargo: e.target.value})} />
                   </div>
                 </div>

                 <div className="input-group" style={{ margin: 0 }}>
                   <label className="input-label">Tipo de Evento Frecuente</label>
                   <select className="input-control" value={formData.tipoEvento} onChange={e => setFormData({...formData, tipoEvento: e.target.value})}>
                     {['Conferencia', 'Boda', 'Fiesta', 'Traducción Simultánea', 'Experiencias Inmersivas', 'Workshop', 'Talleres', 'Ferias', 'Otros'].map(t => (
                        <option key={t} value={t}>{t}</option>
                     ))}
                   </select>
                 </div>

                 <div className="input-group" style={{ margin: 0 }}>
                   <label className="input-label">Dirección Empresa</label>
                   <input type="text" className="input-control" value={formData.direccionEmpresa} onChange={e => setFormData({...formData, direccionEmpresa: e.target.value})} />
                 </div>
                 
                 <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setIsModalOpen(false)}>Cancelar</button>
                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Guardar Cliente</button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {isMappingModalOpen && (
        <div className="modal-overlay">
           <div className="modal-content" style={{ maxWidth: '600px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                 <h2 style={{ margin: 0, fontSize: '1.3rem' }}>Mapear Columnas de Excel</h2>
                 <button className="btn btn-ghost" style={{ padding: '0.4rem', border: 'none' }} onClick={() => setIsMappingModalOpen(false)}>
                    <X size={20} />
                 </button>
              </div>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                Relaciona las columnas de tu archivo Excel con los campos del sistema. Si dejas uno en blanco, no se importará.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', background: 'var(--bg-dark)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                {targetFields.map(tf => (
                  <div key={tf.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, width: '40%' }}>{tf.label}</span>
                    <select 
                      className="input-control" 
                      style={{ width: '55%', padding: '0.5rem' }}
                      value={fieldMapping[tf.key] !== undefined ? fieldMapping[tf.key] : ''}
                      onChange={e => setFieldMapping({...fieldMapping, [tf.key]: e.target.value})}
                    >
                      <option value="">-- Ignorar este campo --</option>
                      {importData.headers.map((h, idx) => (
                        <option key={idx} value={idx}>{h || `Columna ${idx+1}`}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setIsMappingModalOpen(false)}>Cancelar</button>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={processImport}>Iniciar Importación</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default ClientesView;
