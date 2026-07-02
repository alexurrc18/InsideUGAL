import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { getLocales } from 'expo-localization';

const SUPPORTED_LANGS = ['ro', 'en', 'es', 'fr', 'de', 'it', 'el', 'tr', 'vi', 'uk', 'ru', 'ar', 'zh', 'ja', 'ko', 'hi'];
const KEY_LANG = 'settings_lang';
const KEY_THEME = 'settings_theme';

function getDeviceLang(): string {
  const lang = getLocales()[0]?.languageCode;
  return lang && SUPPORTED_LANGS.includes(lang) ? lang : 'en';
}

function lsRead(key: string): string | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function lsWrite(key: string, value: string) {
  try {
    if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
  } catch { /* quota exceeded etc */ }
}

class SettingsStore {
  private theme: "system" | "light" | "dark" = (lsRead(KEY_THEME) as any) || "system";
  private lang: string = lsRead(KEY_LANG) || getDeviceLang();
  private listeners: Set<() => void> = new Set();

  constructor() {
    if (Platform.OS !== 'web') {
      AsyncStorage.multiGet([KEY_LANG, KEY_THEME]).then(([[, lang], [, theme]]) => {
        let changed = false;
        if (lang) { this.lang = lang; changed = true; }
        if (theme && ['system', 'light', 'dark'].includes(theme)) {
          this.theme = theme as any;
          changed = true;
        }
        if (changed) {
          this.notify();
          import('@/i18n').then((mod) => mod.default.changeLanguage(this.lang));
        }
      });
    }
  }

  getTheme() {
    return this.theme;
  }

  setTheme(theme: "system" | "light" | "dark") {
    this.theme = theme;
    lsWrite(KEY_THEME, theme);
    if (Platform.OS !== 'web') AsyncStorage.setItem(KEY_THEME, theme);
    this.notify();
  }

  getLang() {
    return this.lang;
  }

  setLang(lang: string) {
    this.lang = lang;
    lsWrite(KEY_LANG, lang);
    if (Platform.OS !== 'web') AsyncStorage.setItem(KEY_LANG, lang);
    this.notify();
    // Lazy import to avoid circular dependency with i18n init reading settingsStore
    import('@/i18n').then((mod) => mod.default.changeLanguage(lang));
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }
}

export const settingsStore = new SettingsStore();