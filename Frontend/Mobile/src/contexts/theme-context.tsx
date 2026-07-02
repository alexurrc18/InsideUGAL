import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useColorScheme as useSystemColorScheme } from "react-native";
import { settingsStore } from "@/utils/settings-store";

type Scheme = "light" | "dark";
export type ThemeMode = "light" | "dark" | "system";

interface ThemeContextValue {
  scheme: Scheme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Sursa de adevar pentru tema (DOAR pe web).
 *
 * Sincronizată cu settingsStore pentru a menține tema unitară între
 * interfața web generală și setările din interiorul modulului mobil.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useSystemColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => settingsStore.getTheme());

  useEffect(() => {
    const unsubscribe = settingsStore.subscribe(() => {
      setThemeModeState(settingsStore.getTheme());
    });
    return unsubscribe;
  }, []);

  const scheme: Scheme = themeMode === "system"
    ? (system === "dark" ? "dark" : "light")
    : themeMode;

  const setThemeMode = (mode: ThemeMode) => {
    settingsStore.setTheme(mode);
  };

  const toggleTheme = () => {
    settingsStore.setTheme(scheme === "dark" ? "light" : "dark");
  };

  return (
    <ThemeContext.Provider value={{ scheme, themeMode, setThemeMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/** Pentru buton: arunca daca nu e provider (greseala de montare). */
export function useThemeContext() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useThemeContext trebuie folosit în interiorul <ThemeProvider>");
  }
  return ctx;
}

/** Varianta sigura (null daca nu exista provider) — folosita de hook-ul de culori. */
export function useOptionalThemeContext() {
  return useContext(ThemeContext);
}
