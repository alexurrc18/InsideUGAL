import { Pressable, View, Text } from "react-native";
import { ColorScheme, Spacing } from "@/constants/theme";
import { useLanguageContext } from "@/contexts/language-context";
import GlobeIcon from "@/assets/icons/svg/globe.svg";

interface LanguageToggleProps {
  /** Culoarea iconitei + textului. Implicit alb (pe gri-ul navbarului). */
  color?: string;
  /** Culoarea pastilei. Implicit gri-ul navbarului web (#272727). */
  backgroundColor?: string;
}

/**
 * Buton care comuta limba intre RO si EN (DOAR web). Foloseste LanguageContext,
 * deci trebuie montat in interiorul unui <LanguageProvider>.
 * Afiseaza limba CURENTA (RO cand esti pe romana).
 */
export function LanguageToggle({ color = ColorScheme.white, backgroundColor = "#272727" }: LanguageToggleProps) {
  const { lang, toggleLanguage } = useLanguageContext();

  return (
    <Pressable
      onPress={toggleLanguage}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={lang === "ro" ? "Switch to English" : "Comută pe română"}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: Spacing.xs,
          backgroundColor,
          paddingVertical: Spacing.sm,
          paddingHorizontal: Spacing.md,
          borderRadius: 999,
        }}
      >
        <GlobeIcon width={20} height={20} color={color} />
        <Text style={{ color, fontWeight: "600", fontSize: 14 }}>
          {lang.toUpperCase()}
        </Text>
      </View>
    </Pressable>
  );
}
