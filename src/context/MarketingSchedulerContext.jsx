import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useToast } from './ToastContext';

const MarketingSchedulerContext = createContext();

export const MarketingSchedulerProvider = ({ children }) => {
  const [campanas, setCampanas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUsingFallback, setIsUsingFallback] = useState(false);
  const { addToast } = useToast();

  // Carga inicial
  const fetchCampanas = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('planificador_marketing')
        .select('*');

      if (error) throw error;

      if (data) {
        setCampanas(data.map(item => ({
          idCampana: item.id_campana,
          fechaPublicacion: item.fecha_publicacion,
          tipoContenido: item.tipo_contenido,
          canal: item.canal,
          contenidoCopy: item.contenido_copy,
          estado: item.estado
        })));
        setIsUsingFallback(false);
      }
    } catch (err) {
      console.warn('Supabase: La tabla planificador_marketing no pudo ser leída. Usando almacenamiento local.', err);
      setIsUsingFallback(true);
      
      // Fallback a LocalStorage
      const localData = localStorage.getItem('ecosilence_marketing_campaigns_local');
      if (localData) {
        setCampanas(JSON.parse(localData));
      } else {
        // Inicializar con algunos datos de ejemplo hermosos
        const dummyData = [
          {
            idCampana: 'CAMP-001',
            fechaPublicacion: '2026-05-15',
            tipoContenido: 'Carrusel',
            canal: 'Instagram',
            contenidoCopy: '🎧 Silent Event Experience: La revolución del silencio ya está aquí. Tres djs en simultáneo y luces LED de alta definición. #SilentParty',
            estado: 'Programado'
          },
          {
            idCampana: 'CAMP-002',
            fechaPublicacion: '2026-05-20',
            tipoContenido: 'Mail',
            canal: 'Correo',
            contenidoCopy: 'Asunto: Conferencia Sin Ruido 🎙️\n\nEstimado cliente, ¿sabías que el ruido tradicional reduce la atención en tus congresos en un 40%? Descubre la experiencia EcoSilence.',
            estado: 'Borrador'
          }
        ];
        setCampanas(dummyData);
        localStorage.setItem('ecosilence_marketing_campaigns_local', JSON.stringify(dummyData));
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCampanas();
  }, []);

  // Guardar en LocalStorage si estamos en modo fallback
  const saveToLocal = (newCampanas) => {
    setCampanas(newCampanas);
    localStorage.setItem('ecosilence_marketing_campaigns_local', JSON.stringify(newCampanas));
  };

  const addCampana = async (campanaData) => {
    const idCampana = `CAMP-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const newCampana = { ...campanaData, idCampana };

    if (isUsingFallback) {
      const updated = [...campanas, newCampana];
      saveToLocal(updated);
      addToast('Campaña guardada localmente en el navegador.', 'success');
      addToast('Nota: Crea la tabla "planificador_marketing" en Supabase para sincronizar con la nube.', 'warning', 6000);
      return newCampana;
    }

    try {
      const { error } = await supabase.from('planificador_marketing').insert({
        id_campana: idCampana,
        fecha_publicacion: campanaData.fechaPublicacion,
        tipo_contenido: campanaData.tipoContenido,
        canal: campanaData.canal,
        contenido_copy: campanaData.contenidoCopy,
        estado: campanaData.estado
      });

      if (error) throw error;
      setCampanas([...campanas, newCampana]);
      addToast('Campaña programada exitosamente en la nube.', 'success');
      return newCampana;
    } catch (err) {
      console.error('Error al guardar en Supabase. Guardando localmente...', err);
      // Fallback inmediato
      setIsUsingFallback(true);
      const updated = [...campanas, newCampana];
      saveToLocal(updated);
      addToast('Error al conectar con la base de datos. Se guardó localmente en el navegador.', 'warning');
      return newCampana;
    }
  };

  const updateCampana = async (idCampana, updatedData) => {
    const original = campanas.find(c => c.idCampana === idCampana);
    if (!original) return;
    const merged = { ...original, ...updatedData };

    if (isUsingFallback) {
      const updated = campanas.map(c => c.idCampana === idCampana ? merged : c);
      saveToLocal(updated);
      addToast('Campaña modificada localmente.', 'success');
      return;
    }

    try {
      const { error } = await supabase
        .from('planificador_marketing')
        .update({
          fecha_publicacion: merged.fechaPublicacion,
          tipo_contenido: merged.tipoContenido,
          canal: merged.canal,
          contenido_copy: merged.contenidoCopy,
          estado: merged.estado
        })
        .eq('id_campana', idCampana);

      if (error) throw error;
      setCampanas(campanas.map(c => c.idCampana === idCampana ? merged : c));
      addToast('Campaña actualizada exitosamente.', 'success');
    } catch (err) {
      console.error('Error al actualizar en Supabase. Usando LocalStorage...', err);
      setIsUsingFallback(true);
      const updated = campanas.map(c => c.idCampana === idCampana ? merged : c);
      saveToLocal(updated);
      addToast('Actualizado localmente en el navegador.', 'warning');
    }
  };

  const removeCampana = async (idCampana) => {
    if (isUsingFallback) {
      const updated = campanas.filter(c => c.idCampana !== idCampana);
      saveToLocal(updated);
      addToast('Campaña eliminada de forma local.', 'success');
      return;
    }

    try {
      const { error } = await supabase
        .from('planificador_marketing')
        .delete()
        .eq('id_campana', idCampana);

      if (error) throw error;
      setCampanas(campanas.filter(c => c.idCampana !== idCampana));
      addToast('Campaña eliminada definitivamente de la base de datos.', 'success');
    } catch (err) {
      console.error('Error al eliminar en Supabase. Usando LocalStorage...', err);
      setIsUsingFallback(true);
      const updated = campanas.filter(c => c.idCampana !== idCampana);
      saveToLocal(updated);
      addToast('Campaña eliminada localmente.', 'warning');
    }
  };

  return (
    <MarketingSchedulerContext.Provider value={{
      campanas,
      isLoading,
      isUsingFallback,
      addCampana,
      updateCampana,
      removeCampana,
      fetchCampanas
    }}>
      {children}
    </MarketingSchedulerContext.Provider>
  );
};

export const useMarketingScheduler = () => {
  const context = useContext(MarketingSchedulerContext);
  if (!context) {
    throw new Error('useMarketingScheduler debe ser utilizado dentro de MarketingSchedulerProvider');
  }
  return context;
};
