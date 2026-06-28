import { useState, useEffect } from "react";
import { useColorScheme as useRNColorScheme } from "react-native";
import { settingsStore } from "@/utils/settings-store";

export function useColorScheme(): "light" | "dark" {
  const system = useRNColorScheme();
  const [theme, setTheme] = useState(() => settingsStore.getTheme());

  useEffect(() => {
    const unsubscribe = settingsStore.subscribe(() => {
      setTheme(settingsStore.getTheme());
    });
    return unsubscribe;
  }, []);

  if (theme === "system") {
    return system === "dark" ? "dark" : "light";
  }
  return theme;
}
