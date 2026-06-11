// Navbar-ul web (DOAR web — importat doar din _layout.web.tsx, deci nu intra in
// bundle-ul de mobil). Inlocuieste bara de jos (NativeTabs) cu o bara de sus:
//   - stanga: logo
//   - dreapta: link-urile existente + butonul de tema
//
// Comportament: sta fixat in capul paginii (overlay peste continut). Fundalul e
// transparent cat timp pagina nu a fost derulata, apoi apare TREPTAT (fade) cand
// `scrolled` devine true (pagina a trecut de banner). Fundalul solid e mereu
// theme.primary (albastru de brand, identic in light/dark), iar textul ramane alb
// in ambele stari (peste banner si peste albastru) — deci nu depinde de tema.
//
// Aliniere: continutul sta intr-un WebContainer, exact ca titlurile caruselelor,
// ca sa primeasca acelasi `zoom`/padding pe ecrane late => aliniere perfecta cu
// "Noutăți" (stanga) si "Vezi mai multe" (dreapta) la orice latime.
import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useRouter, usePathname } from "expo-router";
import { ColorScheme, Colors, Spacing } from "@/constants/theme";
import { Typography } from "@/constants/typography";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useNavbarScrolled } from "@/contexts/web-scroll-context";
import { WebContainer } from "@/components/ui/web-container";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export const NAVBAR_HEIGHT = 72;

const LOGO = require("@/assets/images/logo.png");

// Link-urile = aceleasi destinatii care erau in NativeTabs. `match` e segmentul cu
// care comparam pathname-ul (care vine fara grupul "(public)") ca sa stim activul.
const LINKS: { label: string; href: string; match: string }[] = [
  { label: "Acasă", href: "/(public)/acasa", match: "/acasa" },
  { label: "Hartă", href: "/(public)/harta", match: "/harta" },
  { label: "Cantină", href: "/(public)/cantina", match: "/cantina" },
  { label: "Sesizări", href: "/(public)/sesizari", match: "/sesizari" },
  { label: "Mai multe", href: "/(public)/more", match: "/more" },
];

export function WebNavbar() {
  const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
  const theme = Colors[themeName];
  const scrolled = useNavbarScrolled();
  const router = useRouter();
  const pathname = usePathname();

  // Opacitatea stratului de fundal solid (albastru): 0 = transparent, 1 = solid.
  const bgOpacity = useRef(new Animated.Value(scrolled ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(bgOpacity, {
      toValue: scrolled ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [scrolled, bgOpacity]);

  return (
    <View style={styles.bar} pointerEvents="box-none">
      {/* Strat de fundal solid (albastru de brand), fade pe scroll. Full-bleed. */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: theme.primary,
            opacity: bgOpacity,
            shadowColor: ColorScheme.pureBlack,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.12,
            shadowRadius: 8,
          },
        ]}
      />

      {/* Continutul aliniat la coloana de continut (acelasi WebContainer + Spacing.lg
          ca titlurile caruselelor). */}
      <WebContainer style={{ minHeight: NAVBAR_HEIGHT, justifyContent: "center" }}>
        <View style={styles.inner}>
          {/* Stanga: logo (duce la Acasa) */}
          <Pressable
            onPress={() => router.push("/(public)/acasa")}
            accessibilityRole="link"
            accessibilityLabel="InsideUGAL — Acasă"
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <Image source={LOGO} style={styles.logo} contentFit="contain" />
          </Pressable>

          {/* Dreapta: link-uri + buton tema */}
          <View style={styles.right}>
            {LINKS.map((link) => {
              const isActive = pathname.startsWith(link.match);
              return (
                <Pressable
                  key={link.href}
                  onPress={() => router.push(link.href as any)}
                  accessibilityRole="link"
                  style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, alignItems: "center" })}
                >
                  <Text
                    style={[
                      isActive ? Typography.Heading6 : Typography.Paragraph2,
                      { color: ColorScheme.white },
                    ]}
                  >
                    {link.label}
                  </Text>
                  {/* Indicator pentru link-ul activ (text mereu alb in ambele stari). */}
                  {isActive && <View style={styles.activeUnderline} />}
                </Pressable>
              );
            })}

            <ThemeToggle size={20} backgroundColor="transparent" borderColor={ColorScheme.white} />
          </View>
        </View>
      </WebContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  inner: {
    // Acelasi padding suplimentar ca rEndul de titlu al caruselului (Spacing.lg),
    // peste padding-ul lateral al WebContainer-ului => aliniere cu "Noutăți".
    paddingHorizontal: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logo: {
    height: 44,
    width: 44,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xl,
  },
  activeUnderline: {
    marginTop: 4,
    height: 2,
    width: "100%",
    borderRadius: 1,
    backgroundColor: ColorScheme.white,
  },
});
