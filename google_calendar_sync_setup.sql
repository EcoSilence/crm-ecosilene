-- ====================================================================
-- ECOSILENCE CRM - CONFIGURACIÓN Y TABLAS PARA SINCRONIZACIÓN DE GOOGLE CALENDAR
-- ====================================================================

-- 1. Agregar columna google_calendar_id a la tabla servicios si no existe
ALTER TABLE servicios ADD COLUMN IF NOT EXISTS google_calendar_id VARCHAR(255) DEFAULT 'primary';

-- 2. Crear tabla de logs de sincronización (sync_logs) para auditoría y reintentos
CREATE TABLE IF NOT EXISTS sync_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    servicio_id VARCHAR(100),
    action VARCHAR(50) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE', 'SYNC_ALL'
    status VARCHAR(50) NOT NULL, -- 'SUCCESS', 'ERROR', 'RETRYING', 'PENDING'
    google_event_id VARCHAR(255),
    error_message TEXT,
    retry_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index para búsquedas rápidas por servicio e historial de errores
CREATE INDEX IF NOT EXISTS idx_sync_logs_servicio_id ON sync_logs(servicio_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON sync_logs(status);

-- 3. Función y Trigger en PostgreSQL para registrar automáticamente cambios de servicios
CREATE OR REPLACE FUNCTION trigger_log_servicio_calendar_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO sync_logs(servicio_id, action, status)
        VALUES (NEW.id_servicio, 'INSERT', 'PENDING');
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        IF (OLD.fecha_inicio IS DISTINCT FROM NEW.fecha_inicio OR
            OLD.fecha_fin IS DISTINCT FROM NEW.fecha_fin OR
            OLD.etapa IS DISTINCT FROM NEW.etapa OR
            OLD.direccion_evento IS DISTINCT FROM NEW.direccion_evento) THEN
            
            INSERT INTO sync_logs(servicio_id, action, status, google_event_id)
            VALUES (NEW.id_servicio, 'UPDATE', 'PENDING', NEW.google_event_id);
        END IF;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO sync_logs(servicio_id, action, status, google_event_id)
        VALUES (OLD.id_servicio, 'DELETE', 'PENDING', OLD.google_event_id);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Asociar el trigger a la tabla servicios (opcional para ejecución autónoma)
DROP TRIGGER IF EXISTS trg_log_servicio_calendar ON servicios;
CREATE TRIGGER trg_log_servicio_calendar
AFTER INSERT OR UPDATE OR DELETE ON servicios
FOR EACH ROW EXECUTE FUNCTION trigger_log_servicio_calendar_change();
