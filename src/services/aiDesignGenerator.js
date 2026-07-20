/**
 * AI Design Generator Service
 * EcoSilence CRM - Assistant design engine powered by marketingskills copywriting frameworks.
 */

export const generateDesignFromPrompt = (prompt) => {
  const normalized = prompt.toLowerCase();
  
  // 1. Detectar ubicación en el prompt
  let location = "todo Chile";
  if (normalized.includes("santiago") || normalized.includes("capital")) {
    location = "Santiago";
  } else if (normalized.includes("valparaíso") || normalized.includes("valparaiso") || normalized.includes("viña") || normalized.includes("costa")) {
    location = "Región de Valparaíso";
  }

  // 2. Clasificar el tema principal y extraer la intención
  let category = "general";
  if (
    normalized.includes("stock") || 
    normalized.includes("equipo") || 
    normalized.includes("audifono") || 
    normalized.includes("auricular") || 
    normalized.includes("nuevo") ||
    normalized.includes("llegaron")
  ) {
    category = "stock";
  } else if (
    normalized.includes("agendar") || 
    normalized.includes("reserva") || 
    normalized.includes("como") || 
    normalized.includes("proceso") || 
    normalized.includes("pago") || 
    normalized.includes("abono")
  ) {
    category = "proceso";
  } else if (
    normalized.includes("cine") || 
    normalized.includes("pelicula") || 
    normalized.includes("evento") || 
    normalized.includes("noche") || 
    normalized.includes("estrellas") || 
    normalized.includes("fiesta") || 
    normalized.includes("yoga") ||
    normalized.includes("outdoor")
  ) {
    category = "temporada";
  }

  // 3. Ensamblar dinámicamente el diseño y copy en base a la categoría y el prompt
  switch (category) {
    case "stock":
      return {
        templateDesign: "catalogo",
        suggestedTheme: "cyberpunk",
        subject: "⚡ ¡Aumento de Stock! Equipos Silent Disco ya disponibles",
        preheader: "Reserva tus audífonos de 3 canales LED para tu próximo evento silencioso.",
        bannerTitle: "STOCK ACTUALIZADO ECOSILENCE",
        bannerGradient: "linear-gradient(135deg,#1d003b, #00103b)",
        heading: `¡Mayor disponibilidad de audio en ${location}!`,
        subtitle: "Equipos sanitizados con tecnología de transmisión UHF de largo alcance.",
        bodyText: "• 3 canales de transmisión simultánea para música, charlas o DJ sets con aislamiento total.\n• Luces LED integradas que brillan según el canal sintonizado, creando un show visual único.\n• Baterías de litio de alto rendimiento con hasta 10 horas de autonomía continua.\n• Sistema ergonómico de vincha ajustable ideal para conferencias y activaciones corporativas.",
        ctaText: "Ver Equipos Disponibles",
        ctaLink: "https://ecosilence.cl/equipos",
        imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600"
      };

    case "proceso":
      return {
        templateDesign: "informativo",
        suggestedTheme: "corporate",
        subject: "📋 Guía Práctica: Cómo asegurar el arriendo de tus equipos EcoSilence",
        preheader: "Sigue estos 3 simples pasos y garantiza el éxito de tu evento sin ruidos.",
        bannerTitle: "RESERVA TU FECHA",
        bannerGradient: "linear-gradient(135deg, #0f1e36, #1b3052)",
        heading: `Reserva formal y segura para tu evento en ${location}`,
        subtitle: "Asegura el audio inmersivo con nuestro proceso ágil y 100% digital.",
        bodyText: "• Paso 1: Solicitas tu cotización adaptada al número de invitados y requerimientos.\n• Paso 2: Abonas el 50% de reserva para congelar la fecha y separar los audífonos.\n• Paso 3: Firmamos el contrato digital y despachamos los equipos listos para sonar directamente.",
        ctaText: "Iniciar Mi Cotización",
        ctaLink: "https://ecosilence.cl/cotizar",
        imageUrl: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600"
      };

    case "temporada":
      const isCine = normalized.includes("cine") || normalized.includes("pelicula");
      const isYoga = normalized.includes("yoga") || normalized.includes("meditacion");
      
      let bannerTitle = "EVENTOS AL AIRE LIBRE";
      let heading = `Experiencias de audio premium en ${location}`;
      let subtitle = "Montaje completo de sonido silencioso e inmersivo.";
      let bodyText = "• Cero contaminación acústica: Respeto estricto a las ordenanzas de ruidos vecinales.\n• Transmisión directa a auriculares inalámbricos individuales de alta fidelidad.\n• Luces LED interactivas que logran una atmósfera única en ambientes nocturnos.\n• Asistencia técnica y sanitización certificada incluida en todos los arriendos.";
      let imageUrl = "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600";
      let gradient = "linear-gradient(135deg,#0a0f24,#150e30)";
      let suggestedTheme = "cinema";
      let subject = "🎬 Silent Show: Vive experiencias al aire libre sin ruidos molestos";
      let preheader = "Sonido inmersivo directo a los auriculares individuales de tus invitados.";

      if (isCine) {
        subject = "🎬 Silent Cinema: Diseña una noche de películas bajo las estrellas";
        preheader = "Cartelera envolvente en pantallas LED gigantes de alto brillo.";
        bannerTitle = "CINE BAJO LAS ESTRELLAS";
        heading = `Función inmersiva de cine al aire libre en ${location}`;
        subtitle = "Organiza proyecciones inolvidables en condominios, empresas o municipios.";
        bodyText = "• Pantallas gigantes LED inflables y proyectores de alta luminosidad.\n• Audio individual de alta fidelidad para escuchar cada susurro y banda sonora.\n• Nos encargamos del montaje, proyección y asistencia técnica in situ.\n• Evento respetuoso con el entorno ideal para plazas y patios comunes.";
        imageUrl = "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600";
        gradient = "linear-gradient(135deg,#1c0202,#000000)";
        suggestedTheme = "cinema";
      } else if (isYoga) {
        subject = "🧘 Yoga Silent Concerts: Clases al aire libre sin distracciones urbanas";
        preheader = "Lleva a tus alumnos a una meditación guiada con nitidez absoluta.";
        bannerTitle = "YOGA & MINDFULNESS OUTDOOR";
        heading = `Clases y meditación sin ruidos externos en ${location}`;
        subtitle = "Combina la voz en vivo del guía con música relajante directo a los oídos.";
        bodyText = "• Conexión directa: Los alumnos escuchan tu voz sin interferencias de tráfico.\n• Música ambiental relajante de fondo sintonizada en auriculares ergonómicos.\n• Equipos ligeros e higienizados ideales para parques, azoteas y playas.\n• Perfecto para activaciones corporativas de bienestar o eventos masivos.";
        imageUrl = "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600";
        gradient = "linear-gradient(135deg,#c84b31,#2d4263)";
        suggestedTheme = "outdoor";
      }

      return {
        templateDesign: "lanzamiento",
        suggestedTheme,
        subject,
        preheader,
        bannerTitle,
        bannerGradient: gradient,
        heading,
        subtitle,
        bodyText,
        ctaText: "Planificar Mi Evento",
        ctaLink: "https://ecosilence.cl/eventos",
        imageUrl
      };

    default:
      // Generador Dinámico de Respaldo Heurístico
      const words = normalized.split(" ").filter(w => w.length > 4);
      const titleKeywords = words.slice(0, 3).join(" ").toUpperCase();
      
      return {
        templateDesign: "lanzamiento",
        suggestedTheme: "minimal",
        subject: "✨ Descubre las Soluciones de Audio de EcoSilence",
        preheader: "Cotiza tu sistema de audífonos inalámbricos para eventos silenciosos.",
        bannerTitle: titleKeywords ? `ECOSILENCE: ${titleKeywords}` : "NUEVA CAMPAÑA ECOSILENCE",
        bannerGradient: "linear-gradient(135deg,#cbd5e0, #e2e8f0)",
        heading: "Diseño Inteligente Personalizado",
        subtitle: "Correos persuasivos generados a partir de tu prompt.",
        bodyText: `Generamos este correo en respuesta a tu solicitud: "${prompt}".\n\n• Puedes editar este texto de forma libre haciendo clic en cualquier bloque.\n• Ajusta las tipografías y el tamaño de la letra con la barra superior de Canva.\n• Configura gradientes e imágenes de fondo desde la pestaña Elementos.`,
        ctaText: "Comenzar Edición",
        ctaLink: "https://ecosilence.cl",
        imageUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600"
      };
  }
};
