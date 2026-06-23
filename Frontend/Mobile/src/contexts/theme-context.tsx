import { createContext, useContext, useState, type ReactNode } from "react";
import { useColorScheme as useSystemColorScheme } from "react-native";

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
 * Porneste din tema sistemului; dupa prima comutare foloseste alegerea
 * utilizatorului. Alegerea nu e salvata intre restarturi (deocamdata).
 * Fisierul e importat exclusiv din fisiere .web — mobilul nu il atinge.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useSystemColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>("system");

  const scheme: Scheme = themeMode === "system"
    ? (system === "dark" ? "dark" : "light")
    : themeMode;

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
  };

  const toggleTheme = () => {
    setThemeModeState(scheme === "dark" ? "light" : "dark");
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
