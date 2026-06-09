import { Pressable, View } from "react-native";
import { ColorScheme, Spacing } from "@/constants/theme";
import { useThemeContext } from "@/contexts/theme-context";
import SunIcon from "@/assets/icons/svg/sun.svg";
import MoonIcon from "@/assets/icons/svg/moon.svg";

interface ThemeToggleProps {
  /** Culoarea iconitei. Implicit alb (pe gri-ul navbarului). */
  color?: string;
  /** Culoarea cercului. Implicit gri-ul navbarului web (#272727). */
  backgroundColor?: string;
  size?: number;
}

/**
 * Buton care comuta tema (DOAR pe web). Foloseste ThemeContext, deci
 * trebuie montat in interiorul unui <ThemeProvider>.
 */
export function ThemeToggle({ color = ColorScheme.white, backgroundColor = "#272727", size = 24 }: ThemeToggleProps) {
  const { scheme, toggleTheme } = useThemeContext();
  const isDark = scheme === "dark";

  // In dark afisam soarele (apesi -> light); in light afisam luna.
  const Icon = isDark ? SunIcon : MoonIcon;

  return (
    <Pressable
      onPress={toggleTheme}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={isDark ? "Comuta pe tema deschisa" : "Comuta pe tema intunecata"}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      <View
        style={{
          backgroundColor,
          padding: Spacing.sm,
          borderRadius: 999,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon width={size} height={size} color={color} />
      </View>
    </Pressable>
  );
}
