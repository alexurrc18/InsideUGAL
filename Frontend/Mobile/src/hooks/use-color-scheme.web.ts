// Pe web, tema vine din ThemeContext (controlabil prin buton). Daca nu exista
// provider deasupra (ex. ecranele de auth), cadem inapoi pe tema sistemului.
// Mobilul foloseste use-color-scheme.ts (neatins) si ramane pe tema sistemului.
import { useColorScheme as useRNColorScheme } from "react-native";
import { useOptionalThemeContext } from "@/contexts/theme-context";

export function useColorScheme() {
  const ctx = useOptionalThemeContext();
  const system = useRNColorScheme();
  return ctx ? ctx.scheme : (system ?? "light");
}
