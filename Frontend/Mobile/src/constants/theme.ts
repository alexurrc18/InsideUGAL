/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';
import { Spacing } from './spacing';

export { Spacing };

export const ColorScheme = {
  black: '#121212',
  white: '#F8F9FA',
  gray: '#6C757D',
  lightGray: '#9CA3AF',

  blue: '#00479E',
  red: '#C81541',
  green: '#3CBB19',
  yellow: '#FFC107',

  pureWhite: '#FFFFFF',
  pureBlack: '#000000',
} as const;

export const Colors = {
  light: {
    text: ColorScheme.black,
    textOnDark: ColorScheme.white,
    textSecondary: ColorScheme.gray,
    background: ColorScheme.white,
    border: ColorScheme.lightGray,
    surface: ColorScheme.pureWhite,

    primary: ColorScheme.blue,
    secondary: ColorScheme.red,

  },
  dark: {
    text: ColorScheme.white,
    textOnDark: ColorScheme.black,
    textSecondary: ColorScheme.lightGray,
    background: ColorScheme.black,
    border: ColorScheme.gray,
    surface: ColorScheme.pureBlack,

    primary: ColorScheme.blue,
    secondary: ColorScheme.red,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

// Margine laterala constanta pe web (desktop), folosita pe paginile din (public)
export const WebSidePadding = 64;

// Latime de referinta ("design width") pe web, folosita prin WebContainer:
//  - sub aceasta latime: layout fluid normal, fara zoom (textul nu se micsoreaza);
//  - peste ea: tot continutul scaleaza proportional cu fereastra (zoom),
//    plafonat la WebMaxScale ca sa nu devina urias pe ecrane foarte late.
export const WebContentMaxWidth = 1100;

// Plafonul de scalare pe web. La 1.5 inseamna ca elementele cresc cel mult cu
// 50% fata de marimea de la baseline; peste asta continutul ramane centrat si
// cresc doar marginile laterale.
export const WebMaxScale = 1.5;
