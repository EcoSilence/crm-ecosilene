/**
 * Email Marketing Themes & Visual Palettes Data
 * EcoSilence CRM - Professional style presets for dynamic rendering.
 */

export const emailThemes = {
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
      ctaText: { fontFamily: 'Montserrat', fontSize: 14, color: '#ffffff', bold: true, italic: false, underline: false, align: 'center' }
    }
  },
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
      ctaText: { fontFamily: 'Inter', fontSize: 14, color: '#ffffff', bold: true, italic: false, underline: false, align: 'center' }
    }
  },
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
      ctaText: { fontFamily: 'Roboto', fontSize: 14, color: '#ffffff', bold: true, italic: false, underline: false, align: 'center' }
    }
  },
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
      ctaText: { fontFamily: 'Montserrat', fontSize: 14, color: '#ffffff', bold: true, italic: false, underline: false, align: 'center' }
    }
  },
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
      ctaText: { fontFamily: 'Trebuchet MS', fontSize: 14, color: '#ffffff', bold: true, italic: false, underline: false, align: 'center' }
    }
  }
};
