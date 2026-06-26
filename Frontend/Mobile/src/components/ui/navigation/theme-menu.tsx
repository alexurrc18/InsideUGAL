// Meniu de tema (DOAR web). Trigger = iconita cog (rotita). La apasare:
//  - cog-ul se roteste (90deg)
//  - sub el apare, cu fade + slide, un meniu dreptunghiular (ca la anunturi) cu optiunile:
//    - Luminos
//    - Întunecat
//    - Implicit dispozitivului
// Se inchide la selectie sau la a doua apasare pe cog. Trebuie montat intr-un <ThemeProvider>.
import { useEffect, useState } from "react";
import { Pressable, View, Text } from "react-native";
import Animated, { useSharedValue, withTiming, useAnimatedStyle, interpolate, Extrapolation, Easing } from "react-native-reanimated";
import { ColorScheme, Spacing, Colors } from "@/constants/theme";
import { Typography } from "@/constants/typography";
import { useThemeContext } from "@/contexts/theme-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import CogIcon from "@/assets/icons/svg/cog.svg";

export function ThemeMenu({
  solid = true,
  open: controlledOpen,
  onToggle,
  onClose,
}: {
  solid?: boolean;
  open?: boolean;
  onToggle?: () => void;
  onClose?: () => void;
}) {
  const [localOpen, setLocalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : localOpen;
  const anim = useSharedValue(0); // 0 = inchis, 1 = deschis

  const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
  const theme = Colors[themeName];
  const { themeMode, setThemeMode } = useThemeContext();

  const toggle = () => {
    if (onToggle) {
      onToggle();
    } else {
      setLocalOpen(!localOpen);
    }
  };

  const close = () => {
    if (onClose) {
      onClose();
    } else {
      setLocalOpen(false);
    }
  };

  useEffect(() => {
    anim.set(withTiming(open ? 1 : 0, {
      duration: open ? 280 : 200,
      easing: Easing.out(Easing.cubic),
    }));
  }, [open, anim]);

  // Cand meniul e deschis si pagina e derulata, il inchidem inapoi (cu animatia
  // inversa). Scroll-ul se intampla in ScrollView-ul paginii, deci ascultam in
  // faza de CAPTURE pe document, ca sa prindem orice container care deruleaza.
  useEffect(() => {
    if (!open) return;
    const closeOnScroll = () => close();
    document.addEventListener("scroll", closeOnScroll, true);
    return () => document.removeEventListener("scroll", closeOnScroll, true);
  }, [open]);

  const cogStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(anim.value, [0, 1], [0, 90], Extrapolation.CLAMP)}deg` }],
  }));
  const dropStyle = useAnimatedStyle(() => ({
    opacity: anim.value,
    transform: [{ translateY: interpolate(anim.value, [0, 1], [-8, 0], Extrapolation.CLAMP) }],
  }));

  const options = [
    { id: "light" as const, label: "Luminos" },
    { id: "dark" as const, label: "Întunecat" },
    { id: "system" as const, label: "Implicit dispozitivului" }
  ];

  return (
    <View style={{ position: "relative", height: "100%", justifyContent: "center" }}>
      {/* Trigger: cog (rotund, border alb ca sa se vada pe navbarul albastru). */}
      <Pressable
        onPress={toggle}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Setări temă"
        style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
      >
        <View
          style={{
            padding: 6,
            borderRadius: 999,
            // Fara border; cand meniul e deschis, fundalul se umple (fade lin pe web).
            backgroundColor: open ? "rgba(255,255,255,0.2)" : "transparent",
            alignItems: "center",
            justifyContent: "center",
            ...({ transitionDuration: "200ms", transitionProperty: "background-color" } as any),
          }}
        >
          <Animated.View style={cogStyle}>
            <CogIcon width={24} height={24} color={ColorScheme.white} />
          </Animated.View>
        </View>
      </Pressable>

      {/* Dropdown: cardul de setări temă, aliniat la dreapta sub iconiță (ca la profil).
          Colturi drepte (borderRadius: 0), shadow si aspect identic cu dropdown-ul de anunturi. */}
      <Animated.View
        pointerEvents={open ? "auto" : "none"}
        style={[
          {
            position: "absolute",
            top: "100%",
            right: 0,
            minWidth: 200,
          },
          dropStyle,
        ]}
      >
        <View
          style={{
            backgroundColor: ColorScheme.pureWhite,
            borderRadius: 0,
            borderWidth: 0,
            overflow: "hidden",
            shadowColor: ColorScheme.pureBlack,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.12,
            shadowRadius: 16,
            paddingVertical: Spacing.xs,
          }}
        >
          {options.map((opt) => {
            const isSelected = themeMode === opt.id;
            return (
              <Pressable
                key={opt.id}
                onPress={() => {
                  setThemeMode(opt.id);
                  close();
                }}
                accessibilityRole="button"
                style={({ pressed, hovered }: any) => [
                  {
                    paddingHorizontal: Spacing.lg,
                    paddingVertical: Spacing.md,
                  },
                  (pressed || hovered || isSelected) && { backgroundColor: "rgba(0, 0, 0, 0.05)" },
                ]}
              >
                {({ pressed, hovered }: any) => (
                  <Text
                    style={[
                      Typography.Heading5,
                      {
                        color: (pressed || hovered || isSelected) ? theme.primary : ColorScheme.black,
                        fontFamily: isSelected ? "InstrumentSans-SemiBold" : "InstrumentSans-Medium",
                      },
                    ]}
                  >
                    {opt.label}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>
      </Animated.View>
    </View>
  );
}
