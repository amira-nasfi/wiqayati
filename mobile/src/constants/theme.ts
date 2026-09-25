/**
 * Wiqayati Mobile Design System & Tokens
 * Système de design médical et bienveillant synchronisé avec le Web.
 */

import '@/global.css';
import { Platform } from 'react-native';

export const WiqayatiTokens = {
  colors: {
    // Fond de page : blanc minéral doux teinté d'eau de menthe
    canvas: '#F4F8F7',
    
    // Surfaces cliniques nettes
    surface: '#FFFFFF',
    surfaceSubtle: '#ECF3F1',
    surfaceHighlight: '#E1F0EB',

    // Bordures discrètes
    border: '#D5E3DF',
    borderSubtle: '#E4ECE9',
    borderStrong: '#184E68',

    // Couleur maîtresse : Bleu Ardoise Clinique
    primary: '#184E68',
    primaryHover: '#133E53',
    primaryLight: '#E8F1F5',

    // Accent : Menthe Vitalité Méditerranéenne
    accent: '#1F8A70',
    accentHover: '#19705B',
    accentLight: '#E6F5F0',

    // Typographie & Encre
    textPrimary: '#14282F',   // Encre bleu-nuit sombre
    textSecondary: '#4D6B75', // Gris bleuté clinique
    textMuted: '#7A959E',     // Libellés discrets
    textInverse: '#FFFFFF',

    // Niveaux de Risque Diabète (lisibles et non alarmistes)
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
        base: '#A23636',      // Grenat / carmin clinique doux
        surface: '#FDF2F2',
        border: '#F2C2C2',
        text: '#732222',
      },
    },
  },

  radii: {
    xs: 4,
    sm: 6,
    md: 10,
    lg: 14,
    full: 9999,
  },
} as const;

export const Colors = {
  light: {
    text: WiqayatiTokens.colors.textPrimary,
    background: WiqayatiTokens.colors.canvas,
    backgroundElement: WiqayatiTokens.colors.surfaceSubtle,
    backgroundSelected: WiqayatiTokens.colors.surfaceHighlight,
    textSecondary: WiqayatiTokens.colors.textSecondary,
    border: WiqayatiTokens.colors.border,
    primary: WiqayatiTokens.colors.primary,
    accent: WiqayatiTokens.colors.accent,
  },
  dark: {
    text: '#F1F7F5',
    background: '#0E1D22',
    backgroundElement: '#16282E',
    backgroundSelected: '#1E363E',
    textSecondary: '#86A3AB',
    border: '#27424B',
    primary: '#4DA5C0',
    accent: '#2CB896',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "'Plus Jakarta Sans', -apple-system, sans-serif",
    serif: 'var(--font-serif)',
    rounded: "'Outfit', sans-serif",
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
