import { useEffect, useState } from "react";
import { Animated, Easing, Linking, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Colors, ColorScheme, Spacing } from "@/constants/theme";
import { Typography } from "@/constants/typography";
import { useColorScheme } from "@/hooks/use-color-scheme";
import UserIcon from "@/assets/icons/svg/user.svg";
import api, { getAuthToken, setAuthToken } from "@/services/api";

// TODO: URL-ul real al Dashboard-ului.
export const DASHBOARD_URL = "https://dashboard.insideugal.ro";

export function ProfileMenu({
  open: controlledOpen,
  onToggle,
  onClose,
}: {
  open?: boolean;
  onToggle?: () => void;
  onClose?: () => void;
}) {
  const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
  const theme = Colors[themeName];
  const router = useRouter();

  const [localOpen, setLocalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : localOpen;
  const [anim] = useState(() => new Animated.Value(0));

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);

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
    let isMounted = true;
    const checkUser = async () => {
      try {
        const token = await getAuthToken();
        if (token) {
          if (isMounted) setIsAuthenticated(true);
          const res = await api.get("/profiles/me");
          if (res.data && isMounted) {
            setUser({
              name: `${res.data.first_name || ""} ${res.data.last_name || ""}`.trim() || "Utilizator",
              email: res.data.email || ""
            });
          }
        } else {
          if (isMounted) {
            setIsAuthenticated(false);
            setUser(null);
          }
        }
      } catch (err) {
        console.warn("[API] Error loading profile for profile-menu:", err);
      }
    };
    if (open) {
      checkUser();
    }
    return () => {
      isMounted = false;
    };
  }, [open]);

  useEffect(() => {
    Animated.timing(anim, {
      toValue: open ? 1 : 0,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [open, anim]);

  // Inchide meniul la scroll (ca meniul de tema).
  useEffect(() => {
    if (!open) return;
    const onScroll = () => close();
    document.addEventListener("scroll", onScroll, true);
    return () => document.removeEventListener("scroll", onScroll, true);
  }, [open]);

  const dropTranslate = anim.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] });

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
    await setAuthToken(null);
    setIsAuthenticated(false);
    setUser(null);
    router.push("/(public)/acasa");
  };

  const handleProfilePress = async () => {
    const token = await getAuthToken();
    if (!token) {
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
    <View style={{ position: "relative" }}>
      {/* Trigger: iconita user, fara border, cu fundal plin cand e deschis (ca rotita). */}
      <Pressable
        onPress={handleProfilePress}
        hitSlop={8}
        accessibilityRole="link"
        accessibilityLabel="Autentificare"
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
        style={{
          position: "absolute",
          top: "100%",
          right: 0,
          marginTop: 8,
          minWidth: 240,
          opacity: anim,
          transform: [{ translateY: dropTranslate }],
        }}
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
              {isAuthenticated ? (user?.name || "Utilizator") : "Neautentificat"}
            </Text>
            {isAuthenticated && user?.email ? (
              <Text style={[Typography.Small2, { color: ColorScheme.gray }]} numberOfLines={1}>
                {user.email}
              </Text>
            ) : null}
          </View>

          <View style={{ height: 1, backgroundColor: "#E5E7EB" }} />

          {isAuthenticated && (
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
              <Text style={[Typography.Heading5, { color: ColorScheme.red }]}>Deconectare</Text>
            </Pressable>
          ) : (
            <Pressable onPress={handleLogin} accessibilityRole="button" style={rowStyle}>
              <Text style={[Typography.Heading5, { color: theme.primary }]}>Autentificare</Text>
            </Pressable>
          )}
        </View>
      </Animated.View>
    </View>
  );
}
