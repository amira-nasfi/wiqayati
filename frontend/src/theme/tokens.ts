/**
 * Wiqayati Design System Tokens
 * Système de design médical et bienveillant pour la prévention du diabète.
 * Partagé sémantiquement entre le frontend web et l'application mobile Expo.
 */

export const WiqayatiTokens = {
  colors: {
    // Fond de page : blanc minéral doux teinté d'eau de menthe (non éblouissant, non clinique)
    canvas: '#F4F8F7',
    
    // Surfaces fonctionnelles (cartes de travail, fiches d'examen)
    surface: '#FFFFFF',
    surfaceSubtle: '#ECF3F1',
    surfaceHighlight: '#E1F0EB',

    // Bordures cliniques nettes (remplacent les ombres floues artificielles)
    border: '#D5E3DF',
    borderSubtle: '#E4ECE9',
    borderStrong: '#A9C4BC',

    // Couleur maîtresse : Bleu Ardoise Clinique (autorité, rigueur médicale)
    primary: '#184E68',
    primaryHover: '#133E53',
    primaryLight: '#E8F1F5',

    // Accent : Menthe Vitalité Méditerranéenne (santé métabolique, bien-être)
    accent: '#1F8A70',
    accentHover: '#19705B',
    accentLight: '#E6F5F0',

    // Typographie & Contrastes (WCAG AAA)
    textPrimary: '#14282F',   // Encre bleu-nuit sombre
    textSecondary: '#4D6B75', // Gris bleuté clinique
    textMuted: '#7A959E',     // Libellés discrets
    textInverse: '#FFFFFF',

    // Niveaux de Risque Diabète (lisibles, cliniques et non anxiogènes)
    risk: {
      faible: {
        base: '#1B7A5A',      // Vert cyprès apaisant
        surface: '#EBF7F2',
        border: '#BFE4D5',
        text: '#12543D',
      },
      intermediaire: {
        base: '#B46B12',      // Ocre miel ambré de vigilance
        surface: '#FCF6EC',
        border: '#F0D5AC',
        text: '#7A4608',
      },
      eleve: {
        base: '#A23636',      // Grenat / carmin clinique doux (non alarmiste)
        surface: '#FDF2F2',
        border: '#F2C2C2',
        text: '#732222',
      },
    },

    // Priorités de file nutritionniste
    priorite: {
      stat: {
        bg: '#FDF2F2',
        border: '#F2C2C2',
        text: '#8F2626',
        stripe: '#A23636',
      },
      urgent: {
        bg: '#FCF6EC',
        border: '#F0D5AC',
        text: '#7A4608',
        stripe: '#B46B12',
      },
      routine: {
        bg: '#EBF7F2',
        border: '#BFE4D5',
        text: '#12543D',
        stripe: '#1B7A5A',
      },
    },
  },

  typography: {
    fontFamilies: {
      primary: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      heading: "'Outfit', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    },
    sizes: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',      // 16px
      md: '1.125rem',   // 18px
      lg: '1.25rem',    // 20px
      xl: '1.5rem',     // 24px
      xxl: '1.875rem',  // 30px
    },
    weights: {
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
    },
  },

  radii: {
    none: '0px',
    xs: '4px',
    sm: '6px',
    md: '10px',
    lg: '14px',
    full: '9999px',
  },

  spacing: {
    xxs: '0.25rem', // 4px
    xs: '0.5rem',   // 8px
    sm: '0.75rem',  // 12px
    md: '1rem',     // 16px
    lg: '1.5rem',   // 24px
    xl: '2rem',     // 32px
    xxl: '3rem',    // 48px
  },

  // Ombres fonctionnelles très discrètes (l'interface s'appuie d'abord sur des bordures)
  shadows: {
    none: 'none',
    subtle: '0 1px 2px rgba(20, 40, 47, 0.04)',
    elevated: '0 4px 12px -2px rgba(20, 40, 47, 0.06)',
    activePanel: '0 8px 24px -4px rgba(24, 78, 104, 0.12)',
  },
} as const;
