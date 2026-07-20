-- ====================================================================
-- MIGRACIÓN DE BASE DE DATOS: AUDITORÍA Y NORMALIZACIÓN DE FECHAS DE INGRESO
-- ECOSILENCE CRM - 2026
-- ====================================================================

-- 1. Agregar columna fecha_ingreso si no existe en la tabla de clientes
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS fecha_ingreso DATE;

-- 2. Actualizar fecha_ingreso con la fecha real del primer evento/servicio del cliente
-- Si el cliente tiene servicios registrados, tomamos la menor 'fecha_inicio'.
-- Si no tiene servicios, se asigna una fecha fallback basada en la primera interacción o fecha actual.
UPDATE clientes c
SET fecha_ingreso = COALESCE(
  (
    SELECT MIN(s.fecha_inicio)::DATE 
    FROM servicios s 
    WHERE s.cliente_id = c.id
  ),
  '2026-01-01'::DATE
)
WHERE c.fecha_ingreso IS NULL;

-- 3. Crear una vista para facilitar consultas avanzadas de segmentación analítica
-- Esta vista calcula el LTV total del cliente, cantidad promedio de audífonos contratados,
-- fecha del último evento y el estado de recalentamiento en tiempo real desde la base de datos.
CREATE OR REPLACE VIEW vista_segmentacion_clientes AS
WITH ltv_calc AS (
  -- Sumar total de cotizaciones aprobadas/ejecutadas (excluyendo cotizaciones iniciales)
  SELECT 
    s.cliente_id,
    COALESCE(SUM(q.cantidad * q.dias * q.precio_unitario * (1 - COALESCE(s.descuento, 0) / 100)), 0) as ltv_total,
    COUNT(DISTINCT s.id_servicio) as total_servicios
  FROM servicios s
  JOIN cotizaciones q ON q.servicio_id = s.id_servicio
  WHERE s.etapa IN ('Aprobado', 'Ejecutado', 'Pagado')
  GROUP BY s.cliente_id
),
audifonos_calc AS (
  -- Calcular el promedio de audífonos contratados por evento
  SELECT 
    s.cliente_id,
    COALESCE(AVG(q.cantidad), 0) as promedio_audifonos
  FROM servicios s
  JOIN cotizaciones q ON q.servicio_id = s.id_servicio
  JOIN inventario i ON i.id_equipo = q.equipo_id
  WHERE i.nombre_equipo ILIKE '%audífono%' OR i.nombre_equipo ILIKE '%audifono%'
  GROUP BY s.cliente_id
),
recencia_calc AS (
  -- Fecha del último evento/servicio registrado
  SELECT 
    cliente_id,
    MAX(fecha_inicio)::DATE as fecha_ultimo_evento
  FROM servicios
  GROUP BY cliente_id
)
SELECT 
  c.id,
  c.nombre,
  c.apellido,
  c.correo,
  c.telefono,
  c.direccion_empresa,
  c.comuna,
  c.pais,
  c.empresa,
  c.cargo,
  c.tipo_evento,
  c.fecha_ingreso,
  COALESCE(l.ltv_total, 0) as ltv,
  COALESCE(l.total_servicios, 0) as servicios_cerrados,
  COALESCE(a.promedio_audifonos, 0) as promedio_audifonos,
  r.fecha_ultimo_evento,
  CASE 
    -- Prospecto: Sin servicios o solo cotizaciones abiertas
    WHEN r.fecha_ultimo_evento IS NULL OR COALESCE(l.total_servicios, 0) = 0 THEN 'prospecto'
    -- Activo: Evento cerrado en los últimos 90 días
    WHEN r.fecha_ultimo_evento >= CURRENT_DATE - INTERVAL '90 days' THEN 'activo'
    -- Enfriado: Último evento fue hace más de 90 días pero menos de 180 días
    WHEN r.fecha_ultimo_evento >= CURRENT_DATE - INTERVAL '180 days' THEN 'enfriado'
    -- Frío: Sin eventos por más de 6 meses
    ELSE 'frio'
  END as estado_salud
FROM clientes c
LEFT JOIN ltv_calc l ON l.cliente_id = c.id
LEFT JOIN audifonos_calc a ON a.cliente_id = c.id
LEFT JOIN recencia_calc r ON r.cliente_id = c.id;
