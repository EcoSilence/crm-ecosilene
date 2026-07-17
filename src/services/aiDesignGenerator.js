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
        bannerTitle: "STOCK ACTUALIZADO ECOSILENCE",
        bannerGradient: "linear-gradient(135deg,#203a43,#2c5364)",
        heading: `¡Mayor disponibilidad de audio en ${location}!`,
        bodyText: `Hemos expandido nuestro inventario con audífonos de 3 canales LED de transmisión simultánea UHF. Perfectos para conferencias multitransmisión y eventos de alta concurrencia con total aislamiento acústico. Reserva tus equipos con anticipación y garantiza un evento impecable.`,
        ctaText: "Ver Equipos Disponibles",
        ctaLink: "https://ecosilence.cl/equipos",
        imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600"
      };

    case "proceso":
      return {
        templateDesign: "informativo",
        bannerTitle: "CÓMO RESERVAR TU SERVICIO",
        bannerGradient: "linear-gradient(135deg,#1f4037,#99f2c8)",
        heading: `Reserva formal y segura para tu evento en ${location}`,
        bodyText: `Asegurar tu arriendo es muy fácil con nuestro proceso digital: \n\n1. Solicitas tu cotización en línea adaptada a tus invitados.\n2. Abonas el 50% de reserva para asegurar los audífonos en tu fecha.\n3. Coordinamos la firma de contrato digital y despachamos los equipos sanitizados directamente a tu locación.`,
        ctaText: "Iniciar Mi Cotización",
        ctaLink: "https://ecosilence.cl/cotizar",
        imageUrl: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600"
      };

    case "temporada":
      const isCine = normalized.includes("cine") || normalized.includes("pelicula");
      const isYoga = normalized.includes("yoga") || normalized.includes("meditacion");
      
      let bannerTitle = "EVENTOS AL AIRE LIBRE";
      let heading = `Experiencias de audio premium en ${location}`;
      let bodyText = `Organiza activaciones al aire libre memorables sin preocuparte por la contaminación acústica. Con nuestros sistemas Silent Show, la música y el audio se transmiten directamente al audífono de cada asistente, logrando una inmersión completa y respetando las normas de ruido vecinal.`;
      let imageUrl = "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600";
      let gradient = "linear-gradient(135deg,#0f2027,#203a43)";

      if (isCine) {
        bannerTitle = "CINE BAJO LAS ESTRELLAS";
        heading = `Función inmersiva de cine al aire libre en ${location}`;
        bodyText = `Disfruta de la mejor cartelera nocturna en tu condominio, empresa o municipalidad. Llevamos pantallas gigantes LED de alto brillo, proyectores y audífonos individuales de alta fidelidad para que sientas cada detalle y susurro de la película de forma envolvente.`;
        imageUrl = "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600";
        gradient = "linear-gradient(135deg,#0a0f24,#150e30)";
      } else if (isYoga) {
        bannerTitle = "YOGA & MINDFULNESS OUTDOOR";
        heading = `Clases y meditación sin distracciones en ${location}`;
        bodyText = `Lleva tus clases de bienestar al siguiente nivel en parques, terrazas o centros deportivos. Con los audífonos inalámbricos EcoSilence, tus alumnos escucharán tu voz con absoluta nitidez y música ambiental relajante sin ruidos urbanos externos.`;
        imageUrl = "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600";
        gradient = "linear-gradient(135deg,#134e5e,#71b280)";
      }

      return {
        templateDesign: "lanzamiento",
        bannerTitle,
        bannerGradient: gradient,
        heading,
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
        bannerTitle: titleKeywords ? `ECOSILENCE: ${titleKeywords}` : "NUEVA CAMPAÑA ECOSILENCE",
        bannerGradient: "linear-gradient(135deg,#667eea,#764ba2)",
        heading: "Diseño Inteligente Personalizado",
        bodyText: `Generamos este correo en respuesta a tu solicitud: "${prompt}". Puedes editar este contenido directamente haciendo clic sobre cualquier párrafo o título del lienzo, ajustar las tipografías con la barra flotante y arrastrar imágenes de soporte.`,
        ctaText: "Comenzar Edición",
        ctaLink: "https://ecosilence.cl",
        imageUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600"
      };
  }
};
