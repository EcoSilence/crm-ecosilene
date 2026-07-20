/**
 * Email Marketing Themes & Visual Palettes Data
 * EcoSilence CRM - 15 Professional style presets for dynamic rendering.
 */

export const emailThemes = {
  // 1. CYBERPUNK
  cyberpunk: {
    id: 'cyberpunk',
    name: 'Dark Neon / Cyberpunk',
    backgroundColor: '#0a0a14',
    bannerGradient: 'linear-gradient(135deg, #1d003b, #00103b)',
    textColor: '#ffffff',
    mutedColor: '#d1b3ff',
    ctaBg: '#bc3cfb',
    ctaColor: '#ffffff',
    ctaRadius: '30px',
    borderColor: '#bc3cfb',
    styles: {
      bannerTitle: { fontFamily: 'Montserrat', fontSize: 32, color: '#f3c6ff', bold: true, italic: false, underline: false, align: 'center' },
      heading: { fontFamily: 'Montserrat', fontSize: 22, color: '#3bfbfb', bold: true, italic: false, underline: false, align: 'center' },
      subtitle: { fontFamily: 'Arial', fontSize: 16, color: '#a085e2', bold: false, italic: true, underline: false, align: 'center' },
      bodyText: { fontFamily: 'Arial', fontSize: 14, color: '#d1b3ff', bold: false, italic: false, underline: false, align: 'center' },
      ctaText: { fontFamily: 'Montserrat', fontSize: 14, color: '#ffffff', bold: true, italic: false, underline: false, align: 'center' },
      col1Title: { fontFamily: 'Montserrat', fontSize: 14, color: '#3bfbfb', bold: true, italic: false, underline: false, align: 'left' },
      col1Text: { fontFamily: 'Arial', fontSize: 12, color: '#d1b3ff', bold: false, italic: false, underline: false, align: 'left' },
      col2Title: { fontFamily: 'Montserrat', fontSize: 14, color: '#3bfbfb', bold: true, italic: false, underline: false, align: 'left' },
      col2Text: { fontFamily: 'Arial', fontSize: 12, color: '#d1b3ff', bold: false, italic: false, underline: false, align: 'left' },
      infoTitle: { fontFamily: 'Montserrat', fontSize: 14, color: '#bc3cfb', bold: true, italic: false, underline: false, align: 'left' },
      infoText: { fontFamily: 'Arial', fontSize: 13, color: '#d1b3ff', bold: false, italic: false, underline: false, align: 'left' }
    }
  },

  // 2. CORPORATE
  corporate: {
    id: 'corporate',
    name: 'Corporate Premium',
    backgroundColor: '#ffffff',
    bannerGradient: 'linear-gradient(135deg, #0f1e36, #1b3052)',
    textColor: '#1a202c',
    mutedColor: '#4a5568',
    ctaBg: '#1e3a8a',
    ctaColor: '#ffffff',
    ctaRadius: '4px',
    borderColor: '#1e3a8a',
    styles: {
      bannerTitle: { fontFamily: 'Inter', fontSize: 28, color: '#ffffff', bold: true, italic: false, underline: false, align: 'center' },
      heading: { fontFamily: 'Inter', fontSize: 22, color: '#0f1e36', bold: true, italic: false, underline: false, align: 'left' },
      subtitle: { fontFamily: 'Arial', fontSize: 15, color: '#718096', bold: false, italic: true, underline: false, align: 'left' },
      bodyText: { fontFamily: 'Arial', fontSize: 14, color: '#4a5568', bold: false, italic: false, underline: false, align: 'left' },
      ctaText: { fontFamily: 'Inter', fontSize: 14, color: '#ffffff', bold: true, italic: false, underline: false, align: 'center' },
      col1Title: { fontFamily: 'Inter', fontSize: 14, color: '#0f1e36', bold: true, italic: false, underline: false, align: 'left' },
      col1Text: { fontFamily: 'Arial', fontSize: 12, color: '#4a5568', bold: false, italic: false, underline: false, align: 'left' },
      col2Title: { fontFamily: 'Inter', fontSize: 14, color: '#0f1e36', bold: true, italic: false, underline: false, align: 'left' },
      col2Text: { fontFamily: 'Arial', fontSize: 12, color: '#4a5568', bold: false, italic: false, underline: false, align: 'left' },
      infoTitle: { fontFamily: 'Inter', fontSize: 14, color: '#1e3a8a', bold: true, italic: false, underline: false, align: 'left' },
      infoText: { fontFamily: 'Arial', fontSize: 13, color: '#4a5568', bold: false, italic: false, underline: false, align: 'left' }
    }
  },

  // 3. CINEMA
  cinema: {
    id: 'cinema',
    name: 'Cinema Night',
    backgroundColor: '#050505',
    bannerGradient: 'linear-gradient(135deg, #1c0202, #000000)',
    textColor: '#f7fafc',
    mutedColor: '#a0aec0',
    ctaBg: '#e50914',
    ctaColor: '#ffffff',
    ctaRadius: '2px',
    borderColor: '#e50914',
    styles: {
      bannerTitle: { fontFamily: 'Roboto', fontSize: 34, color: '#e50914', bold: true, italic: false, underline: false, align: 'center' },
      heading: { fontFamily: 'Roboto', fontSize: 24, color: '#f7fafc', bold: true, italic: false, underline: false, align: 'center' },
      subtitle: { fontFamily: 'Arial', fontSize: 16, color: '#e2a1a1', bold: false, italic: true, underline: false, align: 'center' },
      bodyText: { fontFamily: 'Arial', fontSize: 14, color: '#cbd5e0', bold: false, italic: false, underline: false, align: 'center' },
      ctaText: { fontFamily: 'Roboto', fontSize: 14, color: '#ffffff', bold: true, italic: false, underline: false, align: 'center' },
      col1Title: { fontFamily: 'Roboto', fontSize: 14, color: '#e50914', bold: true, italic: false, underline: false, align: 'left' },
      col1Text: { fontFamily: 'Arial', fontSize: 12, color: '#cbd5e0', bold: false, italic: false, underline: false, align: 'left' },
      col2Title: { fontFamily: 'Roboto', fontSize: 14, color: '#e50914', bold: true, italic: false, underline: false, align: 'left' },
      col2Text: { fontFamily: 'Arial', fontSize: 12, color: '#cbd5e0', bold: false, italic: false, underline: false, align: 'left' },
      infoTitle: { fontFamily: 'Roboto', fontSize: 14, color: '#e50914', bold: true, italic: false, underline: false, align: 'left' },
      infoText: { fontFamily: 'Arial', fontSize: 13, color: '#cbd5e0', bold: false, italic: false, underline: false, align: 'left' }
    }
  },

  // 4. MINIMAL FRESH
  minimal: {
    id: 'minimal',
    name: 'Minimal Fresh',
    backgroundColor: '#f8fafc',
    bannerGradient: 'linear-gradient(135deg, #cbd5e0, #e2e8f0)',
    textColor: '#0f172a',
    mutedColor: '#475569',
    ctaBg: '#0ea5e9',
    ctaColor: '#ffffff',
    ctaRadius: '8px',
    borderColor: '#0ea5e9',
    styles: {
      bannerTitle: { fontFamily: 'Montserrat', fontSize: 26, color: '#0f172a', bold: true, italic: false, underline: false, align: 'center' },
      heading: { fontFamily: 'Montserrat', fontSize: 20, color: '#0f172a', bold: true, italic: false, underline: false, align: 'center' },
      subtitle: { fontFamily: 'Arial', fontSize: 15, color: '#64748b', bold: false, italic: true, underline: false, align: 'center' },
      bodyText: { fontFamily: 'Arial', fontSize: 14, color: '#475569', bold: false, italic: false, underline: false, align: 'center' },
      ctaText: { fontFamily: 'Montserrat', fontSize: 14, color: '#ffffff', bold: true, italic: false, underline: false, align: 'center' },
      col1Title: { fontFamily: 'Montserrat', fontSize: 14, color: '#0f172a', bold: true, italic: false, underline: false, align: 'left' },
      col1Text: { fontFamily: 'Arial', fontSize: 12, color: '#64748b', bold: false, italic: false, underline: false, align: 'left' },
      col2Title: { fontFamily: 'Montserrat', fontSize: 14, color: '#0f172a', bold: true, italic: false, underline: false, align: 'left' },
      col2Text: { fontFamily: 'Arial', fontSize: 12, color: '#64748b', bold: false, italic: false, underline: false, align: 'left' },
      infoTitle: { fontFamily: 'Montserrat', fontSize: 14, color: '#0ea5e9', bold: true, italic: false, underline: false, align: 'left' },
      infoText: { fontFamily: 'Arial', fontSize: 13, color: '#475569', bold: false, italic: false, underline: false, align: 'left' }
    }
  },

  // 5. OUTDOOR FEST
  outdoor: {
    id: 'outdoor',
    name: 'Outdoor Fest',
    backgroundColor: '#fdf6e2',
    bannerGradient: 'linear-gradient(135deg, #c84b31, #2d4263)',
    textColor: '#2d3748',
    mutedColor: '#4a5568',
    ctaBg: '#d97706',
    ctaColor: '#ffffff',
    ctaRadius: '20px',
    borderColor: '#d97706',
    styles: {
      bannerTitle: { fontFamily: 'Trebuchet MS', fontSize: 28, color: '#fdf6e2', bold: true, italic: false, underline: false, align: 'center' },
      heading: { fontFamily: 'Trebuchet MS', fontSize: 22, color: '#c84b31', bold: true, italic: false, underline: false, align: 'center' },
      subtitle: { fontFamily: 'Arial', fontSize: 15, color: '#7e685a', bold: false, italic: true, underline: false, align: 'center' },
      bodyText: { fontFamily: 'Arial', fontSize: 14, color: '#4a5568', bold: false, italic: false, underline: false, align: 'center' },
      ctaText: { fontFamily: 'Trebuchet MS', fontSize: 14, color: '#ffffff', bold: true, italic: false, underline: false, align: 'center' },
      col1Title: { fontFamily: 'Trebuchet MS', fontSize: 14, color: '#c84b31', bold: true, italic: false, underline: false, align: 'left' },
      col1Text: { fontFamily: 'Arial', fontSize: 12, color: '#4a5568', bold: false, italic: false, underline: false, align: 'left' },
      col2Title: { fontFamily: 'Trebuchet MS', fontSize: 14, color: '#c84b31', bold: true, italic: false, underline: false, align: 'left' },
      col2Text: { fontFamily: 'Arial', fontSize: 12, color: '#4a5568', bold: false, italic: false, underline: false, align: 'left' },
      infoTitle: { fontFamily: 'Trebuchet MS', fontSize: 14, color: '#d97706', bold: true, italic: false, underline: false, align: 'left' },
      infoText: { fontFamily: 'Arial', fontSize: 13, color: '#4a5568', bold: false, italic: false, underline: false, align: 'left' }
    }
  },

  // 6. GOLDEN LUXURY
  luxury: {
    id: 'luxury',
    name: 'Golden Luxury',
    backgroundColor: '#121212',
    bannerGradient: 'linear-gradient(135deg, #aa771c, #f3e0aa, #aa771c)',
    textColor: '#ffffff',
    mutedColor: '#d4af37',
    ctaBg: '#d4af37',
    ctaColor: '#121212',
    ctaRadius: '0px',
    borderColor: '#d4af37',
    styles: {
      bannerTitle: { fontFamily: 'Georgia', fontSize: 30, color: '#121212', bold: true, italic: true, underline: false, align: 'center' },
      heading: { fontFamily: 'Georgia', fontSize: 24, color: '#f3e0aa', bold: true, italic: false, underline: false, align: 'center' },
      subtitle: { fontFamily: 'Times New Roman', fontSize: 16, color: '#e5c060', bold: false, italic: true, underline: false, align: 'center' },
      bodyText: { fontFamily: 'Arial', fontSize: 14, color: '#dfdfdf', bold: false, italic: false, underline: false, align: 'center' },
      ctaText: { fontFamily: 'Georgia', fontSize: 14, color: '#121212', bold: true, italic: false, underline: false, align: 'center' },
      col1Title: { fontFamily: 'Georgia', fontSize: 14, color: '#f3e0aa', bold: true, italic: false, underline: false, align: 'left' },
      col1Text: { fontFamily: 'Arial', fontSize: 12, color: '#dfdfdf', bold: false, italic: false, underline: false, align: 'left' },
      col2Title: { fontFamily: 'Georgia', fontSize: 14, color: '#f3e0aa', bold: true, italic: false, underline: false, align: 'left' },
      col2Text: { fontFamily: 'Arial', fontSize: 12, color: '#dfdfdf', bold: false, italic: false, underline: false, align: 'left' },
      infoTitle: { fontFamily: 'Georgia', fontSize: 14, color: '#d4af37', bold: true, italic: false, underline: false, align: 'left' },
      infoText: { fontFamily: 'Arial', fontSize: 13, color: '#dfdfdf', bold: false, italic: false, underline: false, align: 'left' }
    }
  },

  // 7. SUNSET GLOW
  sunset: {
    id: 'sunset',
    name: 'Sunset Glow',
    backgroundColor: '#fffcf9',
    bannerGradient: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)',
    textColor: '#2d1e2f',
    mutedColor: '#a15c89',
    ctaBg: '#fd1d1d',
    ctaColor: '#ffffff',
    ctaRadius: '12px',
    borderColor: '#fd1d1d',
    styles: {
      bannerTitle: { fontFamily: 'Montserrat', fontSize: 28, color: '#ffffff', bold: true, italic: false, underline: false, align: 'center' },
      heading: { fontFamily: 'Montserrat', fontSize: 22, color: '#2d1e2f', bold: true, italic: false, underline: false, align: 'center' },
      subtitle: { fontFamily: 'Arial', fontSize: 15, color: '#a15c89', bold: false, italic: true, underline: false, align: 'center' },
      bodyText: { fontFamily: 'Arial', fontSize: 14, color: '#4a3d4c', bold: false, italic: false, underline: false, align: 'center' },
      ctaText: { fontFamily: 'Montserrat', fontSize: 14, color: '#ffffff', bold: true, italic: false, underline: false, align: 'center' },
      col1Title: { fontFamily: 'Montserrat', fontSize: 14, color: '#2d1e2f', bold: true, italic: false, underline: false, align: 'left' },
      col1Text: { fontFamily: 'Arial', fontSize: 12, color: '#4a3d4c', bold: false, italic: false, underline: false, align: 'left' },
      col2Title: { fontFamily: 'Montserrat', fontSize: 14, color: '#2d1e2f', bold: true, italic: false, underline: false, align: 'left' },
      col2Text: { fontFamily: 'Arial', fontSize: 12, color: '#4a3d4c', bold: false, italic: false, underline: false, align: 'left' },
      infoTitle: { fontFamily: 'Montserrat', fontSize: 14, color: '#fd1d1d', bold: true, italic: false, underline: false, align: 'left' },
      infoText: { fontFamily: 'Arial', fontSize: 13, color: '#4a3d4c', bold: false, italic: false, underline: false, align: 'left' }
    }
  },

  // 8. FOREST HEALING
  forest: {
    id: 'forest',
    name: 'Forest Healing',
    backgroundColor: '#f4fbf7',
    bannerGradient: 'linear-gradient(135deg, #1e3f20, #345c36)',
    textColor: '#1a3020',
    mutedColor: '#5a7862',
    ctaBg: '#2d6a4f',
    ctaColor: '#ffffff',
    ctaRadius: '16px',
    borderColor: '#2d6a4f',
    styles: {
      bannerTitle: { fontFamily: 'Inter', fontSize: 26, color: '#ffffff', bold: true, italic: false, underline: false, align: 'center' },
      heading: { fontFamily: 'Inter', fontSize: 22, color: '#1a3020', bold: true, italic: false, underline: false, align: 'left' },
      subtitle: { fontFamily: 'Arial', fontSize: 15, color: '#5a7862', bold: false, italic: true, underline: false, align: 'left' },
      bodyText: { fontFamily: 'Arial', fontSize: 14, color: '#2d4a36', bold: false, italic: false, underline: false, align: 'left' },
      ctaText: { fontFamily: 'Inter', fontSize: 14, color: '#ffffff', bold: true, italic: false, underline: false, align: 'center' },
      col1Title: { fontFamily: 'Inter', fontSize: 14, color: '#1a3020', bold: true, italic: false, underline: false, align: 'left' },
      col1Text: { fontFamily: 'Arial', fontSize: 12, color: '#2d4a36', bold: false, italic: false, underline: false, align: 'left' },
      col2Title: { fontFamily: 'Inter', fontSize: 14, color: '#1a3020', bold: true, italic: false, underline: false, align: 'left' },
      col2Text: { fontFamily: 'Arial', fontSize: 12, color: '#2d4a36', bold: false, italic: false, underline: false, align: 'left' },
      infoTitle: { fontFamily: 'Inter', fontSize: 14, color: '#2d6a4f', bold: true, italic: false, underline: false, align: 'left' },
      infoText: { fontFamily: 'Arial', fontSize: 13, color: '#2d4a36', bold: false, italic: false, underline: false, align: 'left' }
    }
  },

  // 9. OCEAN BREEZE
  ocean: {
    id: 'ocean',
    name: 'Ocean Breeze',
    backgroundColor: '#f0f9ff',
    bannerGradient: 'linear-gradient(135deg, #0284c7, #0369a1, #0c4a6e)',
    textColor: '#0c4a6e',
    mutedColor: '#0284c7',
    ctaBg: '#0ea5e9',
    ctaColor: '#ffffff',
    ctaRadius: '25px',
    borderColor: '#0ea5e9',
    styles: {
      bannerTitle: { fontFamily: 'Roboto', fontSize: 28, color: '#ffffff', bold: true, italic: false, underline: false, align: 'center' },
      heading: { fontFamily: 'Roboto', fontSize: 22, color: '#0c4a6e', bold: true, italic: false, underline: false, align: 'center' },
      subtitle: { fontFamily: 'Arial', fontSize: 15, color: '#0284c7', bold: false, italic: true, underline: false, align: 'center' },
      bodyText: { fontFamily: 'Arial', fontSize: 14, color: '#334155', bold: false, italic: false, underline: false, align: 'center' },
      ctaText: { fontFamily: 'Roboto', fontSize: 14, color: '#ffffff', bold: true, italic: false, underline: false, align: 'center' },
      col1Title: { fontFamily: 'Roboto', fontSize: 14, color: '#0c4a6e', bold: true, italic: false, underline: false, align: 'left' },
      col1Text: { fontFamily: 'Arial', fontSize: 12, color: '#334155', bold: false, italic: false, underline: false, align: 'left' },
      col2Title: { fontFamily: 'Roboto', fontSize: 14, color: '#0c4a6e', bold: true, italic: false, underline: false, align: 'left' },
      col2Text: { fontFamily: 'Arial', fontSize: 12, color: '#334155', bold: false, italic: false, underline: false, align: 'left' },
      infoTitle: { fontFamily: 'Roboto', fontSize: 14, color: '#0ea5e9', bold: true, italic: false, underline: false, align: 'left' },
      infoText: { fontFamily: 'Arial', fontSize: 13, color: '#334155', bold: false, italic: false, underline: false, align: 'left' }
    }
  },

  // 10. RETRO VAPORWAVE
  vaporwave: {
    id: 'vaporwave',
    name: 'Retro Vaporwave',
    backgroundColor: '#12072b',
    bannerGradient: 'linear-gradient(135deg, #ff007f, #00f0ff)',
    textColor: '#ff79c6',
    mutedColor: '#00f0ff',
    ctaBg: '#ff007f',
    ctaColor: '#ffffff',
    ctaRadius: '6px',
    borderColor: '#ff007f',
    styles: {
      bannerTitle: { fontFamily: 'Courier New', fontSize: 32, color: '#12072b', bold: true, italic: false, underline: false, align: 'center' },
      heading: { fontFamily: 'Courier New', fontSize: 22, color: '#00f0ff', bold: true, italic: false, underline: false, align: 'center' },
      subtitle: { fontFamily: 'Courier New', fontSize: 15, color: '#ff79c6', bold: false, italic: true, underline: false, align: 'center' },
      bodyText: { fontFamily: 'Courier New', fontSize: 13, color: '#e0d0ff', bold: false, italic: false, underline: false, align: 'center' },
      ctaText: { fontFamily: 'Courier New', fontSize: 14, color: '#ffffff', bold: true, italic: false, underline: false, align: 'center' },
      col1Title: { fontFamily: 'Courier New', fontSize: 14, color: '#00f0ff', bold: true, italic: false, underline: false, align: 'left' },
      col1Text: { fontFamily: 'Courier New', fontSize: 11, color: '#e0d0ff', bold: false, italic: false, underline: false, align: 'left' },
      col2Title: { fontFamily: 'Courier New', fontSize: 14, color: '#00f0ff', bold: true, italic: false, underline: false, align: 'left' },
      col2Text: { fontFamily: 'Courier New', fontSize: 11, color: '#e0d0ff', bold: false, italic: false, underline: false, align: 'left' },
      infoTitle: { fontFamily: 'Courier New', fontSize: 14, color: '#ff007f', bold: true, italic: false, underline: false, align: 'left' },
      infoText: { fontFamily: 'Courier New', fontSize: 12, color: '#e0d0ff', bold: false, italic: false, underline: false, align: 'left' }
    }
  },

  // 11. NORDIC COLD
  nordic: {
    id: 'nordic',
    name: 'Nordic Cold',
    backgroundColor: '#f1f5f9',
    bannerGradient: 'linear-gradient(135deg, #475569, #64748b)',
    textColor: '#1e293b',
    mutedColor: '#475569',
    ctaBg: '#334155',
    ctaColor: '#ffffff',
    ctaRadius: '4px',
    borderColor: '#334155',
    styles: {
      bannerTitle: { fontFamily: 'Tahoma', fontSize: 26, color: '#ffffff', bold: true, italic: false, underline: false, align: 'center' },
      heading: { fontFamily: 'Tahoma', fontSize: 20, color: '#1e293b', bold: true, italic: false, underline: false, align: 'left' },
      subtitle: { fontFamily: 'Arial', fontSize: 15, color: '#64748b', bold: false, italic: true, underline: false, align: 'left' },
      bodyText: { fontFamily: 'Arial', fontSize: 14, color: '#475569', bold: false, italic: false, underline: false, align: 'left' },
      ctaText: { fontFamily: 'Tahoma', fontSize: 14, color: '#ffffff', bold: true, italic: false, underline: false, align: 'center' },
      col1Title: { fontFamily: 'Tahoma', fontSize: 14, color: '#1e293b', bold: true, italic: false, underline: false, align: 'left' },
      col1Text: { fontFamily: 'Arial', fontSize: 12, color: '#475569', bold: false, italic: false, underline: false, align: 'left' },
      col2Title: { fontFamily: 'Tahoma', fontSize: 14, color: '#1e293b', bold: true, italic: false, underline: false, align: 'left' },
      col2Text: { fontFamily: 'Arial', fontSize: 12, color: '#475569', bold: false, italic: false, underline: false, align: 'left' },
      infoTitle: { fontFamily: 'Tahoma', fontSize: 14, color: '#334155', bold: true, italic: false, underline: false, align: 'left' },
      infoText: { fontFamily: 'Arial', fontSize: 13, color: '#475569', bold: false, italic: false, underline: false, align: 'left' }
    }
  },

  // 12. SWEET PASTEL
  pastel: {
    id: 'pastel',
    name: 'Sweet Pastel / Cotton',
    backgroundColor: '#fff5f8',
    bannerGradient: 'linear-gradient(135deg, #ffc0cb, #e8a7f5)',
    textColor: '#4c2d54',
    mutedColor: '#a85b9b',
    ctaBg: '#e8a7f5',
    ctaColor: '#ffffff',
    ctaRadius: '15px',
    borderColor: '#e8a7f5',
    styles: {
      bannerTitle: { fontFamily: 'Century Gothic', fontSize: 28, color: '#4c2d54', bold: true, italic: false, underline: false, align: 'center' },
      heading: { fontFamily: 'Century Gothic', fontSize: 22, color: '#4c2d54', bold: true, italic: false, underline: false, align: 'center' },
      subtitle: { fontFamily: 'Arial', fontSize: 15, color: '#a85b9b', bold: false, italic: true, underline: false, align: 'center' },
      bodyText: { fontFamily: 'Arial', fontSize: 14, color: '#74547c', bold: false, italic: false, underline: false, align: 'center' },
      ctaText: { fontFamily: 'Century Gothic', fontSize: 14, color: '#ffffff', bold: true, italic: false, underline: false, align: 'center' },
      col1Title: { fontFamily: 'Century Gothic', fontSize: 14, color: '#4c2d54', bold: true, italic: false, underline: false, align: 'left' },
      col1Text: { fontFamily: 'Arial', fontSize: 12, color: '#74547c', bold: false, italic: false, underline: false, align: 'left' },
      col2Title: { fontFamily: 'Century Gothic', fontSize: 14, color: '#4c2d54', bold: true, italic: false, underline: false, align: 'left' },
      col2Text: { fontFamily: 'Arial', fontSize: 12, color: '#74547c', bold: false, italic: false, underline: false, align: 'left' },
      infoTitle: { fontFamily: 'Century Gothic', fontSize: 14, color: '#a85b9b', bold: true, italic: false, underline: false, align: 'left' },
      infoText: { fontFamily: 'Arial', fontSize: 13, color: '#74547c', bold: false, italic: false, underline: false, align: 'left' }
    }
  },

  // 13. ECO GREEN
  eco: {
    id: 'eco',
    name: 'Eco Green / Organic',
    backgroundColor: '#f7f9f6',
    bannerGradient: 'linear-gradient(135deg, #047857, #065f46)',
    textColor: '#064e3b',
    mutedColor: '#047857',
    ctaBg: '#059669',
    ctaColor: '#ffffff',
    ctaRadius: '12px',
    borderColor: '#059669',
    styles: {
      bannerTitle: { fontFamily: 'Inter', fontSize: 26, color: '#ffffff', bold: true, italic: false, underline: false, align: 'center' },
      heading: { fontFamily: 'Inter', fontSize: 22, color: '#064e3b', bold: true, italic: false, underline: false, align: 'left' },
      subtitle: { fontFamily: 'Arial', fontSize: 15, color: '#047857', bold: false, italic: true, underline: false, align: 'left' },
      bodyText: { fontFamily: 'Arial', fontSize: 14, color: '#374151', bold: false, italic: false, underline: false, align: 'left' },
      ctaText: { fontFamily: 'Inter', fontSize: 14, color: '#ffffff', bold: true, italic: false, underline: false, align: 'center' },
      col1Title: { fontFamily: 'Inter', fontSize: 14, color: '#064e3b', bold: true, italic: false, underline: false, align: 'left' },
      col1Text: { fontFamily: 'Arial', fontSize: 12, color: '#374151', bold: false, italic: false, underline: false, align: 'left' },
      col2Title: { fontFamily: 'Inter', fontSize: 14, color: '#064e3b', bold: true, italic: false, underline: false, align: 'left' },
      col2Text: { fontFamily: 'Arial', fontSize: 12, color: '#374151', bold: false, italic: false, underline: false, align: 'left' },
      infoTitle: { fontFamily: 'Inter', fontSize: 14, color: '#059669', bold: true, italic: false, underline: false, align: 'left' },
      infoText: { fontFamily: 'Arial', fontSize: 13, color: '#374151', bold: false, italic: false, underline: false, align: 'left' }
    }
  },

  // 14. ROYAL VELVET
  royal: {
    id: 'royal',
    name: 'Royal Velvet / Gold',
    backgroundColor: '#fffdf9',
    bannerGradient: 'linear-gradient(135deg, #4c1d95, #2e1065)',
    textColor: '#2e1065',
    mutedColor: '#7c3aed',
    ctaBg: '#d97706',
    ctaColor: '#ffffff',
    ctaRadius: '6px',
    borderColor: '#d97706',
    styles: {
      bannerTitle: { fontFamily: 'Garamond', fontSize: 32, color: '#ffffff', bold: true, italic: true, underline: false, align: 'center' },
      heading: { fontFamily: 'Garamond', fontSize: 24, color: '#2e1065', bold: true, italic: false, underline: false, align: 'center' },
      subtitle: { fontFamily: 'Times New Roman', fontSize: 16, color: '#7c3aed', bold: false, italic: true, underline: false, align: 'center' },
      bodyText: { fontFamily: 'Arial', fontSize: 14, color: '#4b5563', bold: false, italic: false, underline: false, align: 'center' },
      ctaText: { fontFamily: 'Garamond', fontSize: 15, color: '#ffffff', bold: true, italic: false, underline: false, align: 'center' },
      col1Title: { fontFamily: 'Garamond', fontSize: 15, color: '#2e1065', bold: true, italic: false, underline: false, align: 'left' },
      col1Text: { fontFamily: 'Arial', fontSize: 12, color: '#4b5563', bold: false, italic: false, underline: false, align: 'left' },
      col2Title: { fontFamily: 'Garamond', fontSize: 15, color: '#2e1065', bold: true, italic: false, underline: false, align: 'left' },
      col2Text: { fontFamily: 'Arial', fontSize: 12, color: '#4b5563', bold: false, italic: false, underline: false, align: 'left' },
      infoTitle: { fontFamily: 'Garamond', fontSize: 15, color: '#d97706', bold: true, italic: false, underline: false, align: 'left' },
      infoText: { fontFamily: 'Arial', fontSize: 13, color: '#4b5563', bold: false, italic: false, underline: false, align: 'left' }
    }
  },

  // 15. TECH MINIMALIST
  tech: {
    id: 'tech',
    name: 'Tech Minimalist',
    backgroundColor: '#09090b',
    bannerGradient: 'linear-gradient(135deg, #18181b, #27272a)',
    textColor: '#f4f4f5',
    mutedColor: '#22c55e',
    ctaBg: '#22c55e',
    ctaColor: '#09090b',
    ctaRadius: '0px',
    borderColor: '#22c55e',
    styles: {
      bannerTitle: { fontFamily: 'Helvetica', fontSize: 26, color: '#ffffff', bold: true, italic: false, underline: false, align: 'center' },
      heading: { fontFamily: 'Helvetica', fontSize: 22, color: '#f4f4f5', bold: true, italic: false, underline: false, align: 'left' },
      subtitle: { fontFamily: 'Helvetica', fontSize: 15, color: '#22c55e', bold: false, italic: true, underline: false, align: 'left' },
      bodyText: { fontFamily: 'Helvetica', fontSize: 13, color: '#a1a1aa', bold: false, italic: false, underline: false, align: 'left' },
      ctaText: { fontFamily: 'Helvetica', fontSize: 14, color: '#09090b', bold: true, italic: false, underline: false, align: 'center' },
      col1Title: { fontFamily: 'Helvetica', fontSize: 14, color: '#f4f4f5', bold: true, italic: false, underline: false, align: 'left' },
      col1Text: { fontFamily: 'Helvetica', fontSize: 11, color: '#a1a1aa', bold: false, italic: false, underline: false, align: 'left' },
      col2Title: { fontFamily: 'Helvetica', fontSize: 14, color: '#f4f4f5', bold: true, italic: false, underline: false, align: 'left' },
      col2Text: { fontFamily: 'Helvetica', fontSize: 11, color: '#a1a1aa', bold: false, italic: false, underline: false, align: 'left' },
      infoTitle: { fontFamily: 'Helvetica', fontSize: 14, color: '#22c55e', bold: true, italic: false, underline: false, align: 'left' },
      infoText: { fontFamily: 'Helvetica', fontSize: 12, color: '#a1a1aa', bold: false, italic: false, underline: false, align: 'left' }
    }
  }
};
