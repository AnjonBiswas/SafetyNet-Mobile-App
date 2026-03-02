/**
 * SafetyNet-Parent Mobile Theme
 * Matching SafetyNet app design
 */

export const theme = {
  // Primary Colors (Pink/Red)
  colors: {
    primary: '#ff4063',
    primaryDark: '#ff3359',
    primaryDarker: '#ff2b55',
    primaryDarkest: '#ff1c46',
    primaryLight: '#ff6b8a',
    primaryGradient: ['#ff4b6e', '#ff135a'],

    // Secondary Colors
    secondary: '#1ac8a6', // Teal
    blue: '#2c9df2',

    // Background Colors
    background: '#ffffff',
    backgroundLight: '#f6f9ff',
    backgroundGradient: ['rgba(255, 145, 235, 0.85)', 'rgb(255, 203, 228)'],
    backgroundCard: '#ffffff',
    backgroundMuted: '#ebebebbf',

    // Text Colors
    text: '#1f2933',
    textDark: '#333333',
    textMuted: '#6b7a88',
    textLight: '#666666',
    textWhite: '#ffffff',

    // Status Colors
    success: '#28a745',
    successDark: '#218838',
    error: '#dc3545',
    warning: '#ffc107',
    info: '#17a2b8',

    // Border Colors
    border: '#dddddd',
    borderLight: '#eeeeee',
    borderFocus: '#ff4b6e',

    // Shadow Colors
    shadow: 'rgba(0, 0, 0, 0.1)',
    shadowLight: 'rgba(0, 0, 0, 0.05)',
    shadowDark: 'rgba(0, 0, 0, 0.3)',
    shadowCard: 'rgba(16, 24, 40, 0.08)',

    // Overlay
    overlay: 'rgba(0, 0, 0, 0.5)',

    // Banner Colors
    bannerGradient: ['rgba(227, 70, 138, 0.733)', 'rgba(211, 114, 190, 0.61)'],
  },

  // Typography
  fonts: {
    // Primary font family
    primary: 'System',
    primaryFallback: 'System',

    // Heading font
    heading: 'System',
    headingFallback: 'System',

    // Font sizes
    sizes: {
      xs: 12,
      sm: 14,
      base: 16,
      lg: 18,
      xl: 20,
      '2xl': 20,
      '3xl': 30,
      '4xl': 36,
      '5xl': 48,
    },

    // Font weights
    weights: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  },

  // Spacing
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    base: 16,
    lg: 20,
    xl: 24,
    '2xl': 32,
    '3xl': 40,
    '4xl': 48,
    '5xl': 64,
  },

  // Border Radius
  borderRadius: {
    sm: 5,
    md: 8,
    lg: 10,
    xl: 12,
    '2xl': 15,
    '3xl': 20,
    full: 50,
    round: 9999,
  },

  // Shadows
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 8,
    },
    xl: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 12,
    },
    card: {
      shadowColor: 'rgba(16, 24, 40, 0.08)',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 1,
      shadowRadius: 40,
      elevation: 8,
    },
  },

  // Button Styles
  buttons: {
    primary: {
      backgroundColor: '#ff4b6e',
      color: '#ffffff',
      borderRadius: 25,
      paddingVertical: 12,
      paddingHorizontal: 24,
    },
    secondary: {
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderColor: '#ffffff',
      color: '#ffffff',
      borderRadius: 25,
      paddingVertical: 12,
      paddingHorizontal: 24,
    },
    success: {
      backgroundColor: '#28a745',
      color: '#ffffff',
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 24,
    },
  },

  // Input Styles
  inputs: {
    default: {
      borderWidth: 1,
      borderColor: '#dddddd',
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 16,
      fontSize: 16,
      color: '#333333',
    },
    focus: {
      borderColor: '#ff4b6e',
    },
    error: {
      borderColor: '#dc3545',
    },
  },

  // Card Styles
  cards: {
    default: {
      backgroundColor: '#ffffff',
      borderRadius: 20,
      padding: 24,
    },
    elevated: {
      backgroundColor: '#ffffff',
      borderRadius: 20,
      padding: 30,
    },
  },
};

export default theme;

