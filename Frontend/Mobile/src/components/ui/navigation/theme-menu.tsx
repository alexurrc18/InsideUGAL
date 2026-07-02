import { useEffect, useState, useRef } from "react";
import { Pressable, View, Text, Platform, ScrollView } from "react-native";
import Animated, { useSharedValue, withTiming, useAnimatedStyle, interpolate, Extrapolation, Easing } from "react-native-reanimated";
import { ColorScheme, Spacing, Colors } from "@/constants/theme";
import { Typography } from "@/constants/typography";
import { useThemeContext } from "@/contexts/theme-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { settingsStore } from "@/utils/settings-store";
import CogIcon from "@/assets/icons/svg/cog.svg";
import ChevronIcon from "@/assets/icons/svg/chevron-left.svg";
import { useTranslation } from "react-i18next";
import { LANGUAGES } from "@/constants/languages";

const THEMES = [
  { id: "system" as const, label: "Sistem" },
  { id: "light" as const, label: "Luminos" },
  { id: "dark" as const, label: "Întunecat" },
];

const SHADOW = {
  shadowColor: ColorScheme.pureBlack,
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.12,
  shadowRadius: 16,
};

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
  const containerRef = useRef<any>(null);
  const [localOpen, setLocalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : localOpen;
  const [subMenu, setSubMenu] = useState<"tema" | "limba" | null>(null);
  const anim = useSharedValue(0);
  const subAnim = useSharedValue(0);

  const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
  const theme = Colors[themeName];
  const { themeMode, setThemeMode } = useThemeContext();
  const [selectedLang, setSelectedLang] = useState(() => settingsStore.getLang());
  const { t } = useTranslation();

  useEffect(() => settingsStore.subscribe(() => setSelectedLang(settingsStore.getLang())), []);

  const toggle = () => onToggle ? onToggle() : setLocalOpen((v) => !v);
  const close = () => {
    setSubMenu(null);
    if (onClose) onClose(); else setLocalOpen(false);
  };

  // Reseteaza submeniul cand "open" trece la false (inclusiv cand parintele
  // il inchide direct, fara sa treaca prin close()) - ajustare de stare in
  // timpul randarii, nu intr-un efect, ca sa evitam randari in cascada.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (!open) setSubMenu(null);
  }

  useEffect(() => {
    anim.set(withTiming(open ? 1 : 0, { duration: open ? 280 : 200, easing: Easing.out(Easing.cubic) }));
  }, [open, anim]);

  useEffect(() => {
    subAnim.set(withTiming(subMenu ? 1 : 0, { duration: 200, easing: Easing.out(Easing.cubic) }));
  }, [subMenu, subAnim]);

  useEffect(() => {
    if (!open) return;
    const closeOnScroll = (e: Event) => {
      if (containerRef.current && typeof containerRef.current.contains === 'function') {
        if (containerRef.current.contains(e.target as Node)) {
          return;
        }
      }
      close();
    };
    document.addEventListener("scroll", closeOnScroll, true);

    let onClickOutside: any;
    if (Platform.OS === 'web') {
      onClickOutside = (e: MouseEvent) => {
        if (containerRef.current && typeof containerRef.current.contains === 'function') {
          if (!containerRef.current.contains(e.target as Node)) {
            close();
          }
        }
      };
      document.addEventListener("click", onClickOutside, true);
    }

    return () => {
      document.removeEventListener("scroll", closeOnScroll, true);
      if (Platform.OS === 'web' && onClickOutside) {
        document.removeEventListener("click", onClickOutside, true);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const cogStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(anim.value, [0, 1], [0, 90], Extrapolation.CLAMP)}deg` }],
  }));
  const dropStyle = useAnimatedStyle(() => ({
    opacity: anim.value,
    transform: [{ translateY: interpolate(anim.value, [0, 1], [-8, 0], Extrapolation.CLAMP) }],
  }));
  const subStyle = useAnimatedStyle(() => ({
    opacity: subAnim.value,
    transform: [{ translateX: interpolate(subAnim.value, [0, 1], [8, 0], Extrapolation.CLAMP) }],
  }));

  const themeLabel = themeMode === 'system' ? t('theme.system') : themeMode === 'light' ? t('theme.light') : themeMode === 'dark' ? t('theme.dark') : themeMode;
  const langLabel = LANGUAGES.find((l) => l.code === selectedLang)?.label ?? selectedLang;

  return (
    <View ref={containerRef} style={{ position: "relative", height: "100%", justifyContent: "center" }}>
      <Pressable
        onPress={toggle}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={t('settings.title')}
        style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
      >
        <View
          style={{
            padding: 6,
            borderRadius: 999,
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

      {/* Panoul principal */}
      <Animated.View
        pointerEvents={open ? "auto" : "none"}
        style={[{ position: "absolute", top: "100%", right: 0 }, dropStyle]}
      >
        {/* Panoul secundar (temă / limbă) — apare absolut la stânga panoului principal */}
        <Animated.View
          pointerEvents={subMenu ? "auto" : "none"}
          style={[{ position: "absolute", top: "100%", right: 0, minWidth: 260, marginTop: Spacing.xs }, subStyle]}
        >
          <View style={{ backgroundColor: theme.surface, overflow: "hidden", paddingVertical: Spacing.xs, ...SHADOW }}>
            {subMenu === "tema" ? (
              THEMES.map((opt: any) => {
                const isSelected = themeMode === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => {
                      setThemeMode(opt.id);
                      setSubMenu(null);
                    }}
                    accessibilityRole="button"
                    style={({ pressed, hovered }: any) => [
                      { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
                      (pressed || hovered || isSelected) && { backgroundColor: "rgba(0,0,0,0.05)" },
                    ]}
                  >
                    {({ pressed, hovered }: any) => (
                      <Text style={[Typography.Heading5, {
                        color: (pressed || hovered || isSelected) ? theme.primary : theme.text,
                        fontFamily: isSelected ? "InstrumentSans-SemiBold" : "InstrumentSans-Medium",
                      }]}>
                        {opt.id === "system" ? t('theme.system') : opt.id === "light" ? t('theme.light') : opt.id === "dark" ? t('theme.dark') : opt.label}
                      </Text>
                    )}
                  </Pressable>
                );
              })
            ) : (
              <ScrollView style={{ maxHeight: 250 }}>
                {LANGUAGES.map((opt: any) => {
                  const isSelected = selectedLang === opt.code;
                  return (
                    <Pressable
                      key={opt.code}
                      onPress={() => {
                        settingsStore.setLang(opt.code);
                        setSubMenu(null);
                      }}
                      accessibilityRole="button"
                      style={({ pressed, hovered }: any) => [
                        { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
                        (pressed || hovered || isSelected) && { backgroundColor: "rgba(0,0,0,0.05)" },
                      ]}
                    >
                      {({ pressed, hovered }: any) => (
                        <Text style={[Typography.Heading5, {
                          color: (pressed || hovered || isSelected) ? theme.primary : theme.text,
                          fontFamily: isSelected ? "InstrumentSans-SemiBold" : "InstrumentSans-Medium",
                        }]}>
                          {opt.label}
                        </Text>
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </Animated.View>

        {/* Panoul principal: Temă curentă + Limbă curentă */}
        <View style={{ minWidth: 260, backgroundColor: theme.surface, overflow: "hidden", paddingVertical: Spacing.xs, ...SHADOW }}>
          {[
            { label: t('theme.current'), value: themeLabel, sub: "tema" as const },
            { label: t('language.current'), value: langLabel, sub: "limba" as const },
          ].map((item, i) => {
            const isActive = subMenu === item.sub;
            return (
              <Pressable
                key={item.sub}
                onPress={() => setSubMenu(isActive ? null : item.sub)}
                accessibilityRole="button"
                style={({ pressed, hovered }: any) => [
                  {
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingHorizontal: Spacing.lg,
                    paddingVertical: Spacing.md,
                    borderTopWidth: i > 0 ? 1 : 0,
                    borderTopColor: "rgba(0,0,0,0.08)",
                  },
                  (pressed || hovered || isActive) && { backgroundColor: "rgba(0,0,0,0.05)" },
                ]}
              >
                {({ pressed, hovered }: any) => (
                  <>
                    <Text style={{ color: theme.text, fontFamily: "InstrumentSans-Medium", fontSize: 16 }}>
                      {item.label}:{" "}
                      <Text style={{ color: theme.primary, fontFamily: "InstrumentSans-Bold" }}>
                        {item.value}
                      </Text>
                    </Text>
                    <ChevronIcon
                      width={16}
                      height={16}
                      color={(pressed || hovered || isActive) ? theme.primary : "rgba(0,0,0,0.3)"}
                      style={{ transform: [{ rotate: "180deg" }] }}
                    />
                  </>
                )}
              </Pressable>
            );
          })}
        </View>
      </Animated.View>
    </View>
  );
}