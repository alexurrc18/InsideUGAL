import { useEffect, useState, useRef } from "react";
import { Linking, Pressable, Text, View, Platform } from "react-native";
import Animated, { useSharedValue, withTiming, useAnimatedStyle, interpolate, Extrapolation, Easing } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { Colors, ColorScheme, Spacing } from "@/constants/theme";
import { Typography } from "@/constants/typography";
import { useColorScheme } from "@/hooks/use-color-scheme";
import UserIcon from "@/assets/icons/svg/user.svg";
import { useAuth } from "@/contexts/auth-context";
import { Config } from "@/constants/config";
import { useTranslation } from "react-i18next";

export const DASHBOARD_URL = Config.DASHBOARD_URL || "";

export function ProfileMenu({
  open: controlledOpen,
  onToggle,
  onClose,
}: {
  open?: boolean;
  onToggle?: () => void;
  onClose?: () => void;
}) {
  const containerRef = useRef<any>(null);
  const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
  const theme = Colors[themeName];
  const router = useRouter();
  const { isAuthenticated, user, logout } = useAuth();
  const { t } = useTranslation();

  const [localOpen, setLocalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : localOpen;
  const anim = useSharedValue(0);

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
      duration: 200,
      easing: Easing.out(Easing.cubic),
    }));
  }, [open, anim]);

  // Inchide meniul la scroll si la click in afara (pe web).
  useEffect(() => {
    if (!open) return;
    const onScroll = () => close();
    document.addEventListener("scroll", onScroll, true);

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
      document.removeEventListener("scroll", onScroll, true);
      if (Platform.OS === 'web' && onClickOutside) {
        document.removeEventListener("click", onClickOutside, true);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const dropStyle = useAnimatedStyle(() => ({
    opacity: anim.value,
    transform: [{ translateY: interpolate(anim.value, [0, 1], [-8, 0], Extrapolation.CLAMP) }],
  }));

  const handleDashboard = () => {
    close();
    Linking.openURL(DASHBOARD_URL).catch(() => {});
  };

  const handleLogin = () => {
    close();
    router.push("/(auth)");
  };

  const handleLogout = async () => {
    close();
    await logout();
    router.push("/(public)/acasa");
  };

  const handleProfilePress = () => {
    if (!isAuthenticated) {
      router.push("/(auth)");
      return;
    }
    toggle();
  };

  const rowStyle = ({ pressed, hovered }: any) => [
    { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
    (pressed || hovered) && { backgroundColor: "rgba(0, 0, 0, 0.05)" },
  ];

  return (
    <View ref={containerRef} style={{ position: "relative", height: "100%", justifyContent: "center" }}>
      {/* Trigger: iconita user, fara border, cu fundal plin cand e deschis (ca rotita). */}
      <Pressable
        onPress={handleProfilePress}
        hitSlop={8}
        accessibilityRole="link"
        accessibilityLabel={isAuthenticated ? t('more.profileTitle') : t('navbar.login')}
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
          <UserIcon width={24} height={24} color={ColorScheme.white} />
        </View>
      </Pressable>

      {/* Card-ul de profil, aliniat la dreapta sub iconita. */}
      <Animated.View
        pointerEvents={open ? "auto" : "none"}
        style={[
          {
            position: "absolute",
            top: "100%",
            right: 0,
            minWidth: 240,
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
          }}
        >
          {/* Antet: cine e conectat (nume + email). */}
          <View style={{ paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: 2 }}>
            <Text style={[Typography.Heading5, { color: ColorScheme.black }]} numberOfLines={1}>
              {isAuthenticated ? (user?.name || t('common.user')) : t('navbar.unauthenticated')}
            </Text>
            {isAuthenticated && user?.email ? (
              <Text style={[Typography.Small2, { color: ColorScheme.gray }]} numberOfLines={1}>
                {user.email}
              </Text>
            ) : null}
          </View>

          <View style={{ height: 1, backgroundColor: "#E5E7EB" }} />

          {isAuthenticated && user?.role !== "STUDENT" && (
            <Pressable onPress={handleDashboard} accessibilityRole="link" style={rowStyle}>
              {({ pressed, hovered }: any) => (
                <Text style={[Typography.Heading5, { color: (pressed || hovered) ? theme.primary : ColorScheme.black }]}>
                  Dashboard
                </Text>
              )}
            </Pressable>
          )}

          {isAuthenticated ? (
            <Pressable onPress={handleLogout} accessibilityRole="button" style={rowStyle}>
              <Text style={[Typography.Heading5, { color: ColorScheme.red }]}>{t('navbar.logout')}</Text>
            </Pressable>
          ) : (
            <Pressable onPress={handleLogin} accessibilityRole="button" style={rowStyle}>
              <Text style={[Typography.Heading5, { color: theme.primary }]}>{t('navbar.login')}</Text>
            </Pressable>
          )}
        </View>
      </Animated.View>
    </View>
  );
}
