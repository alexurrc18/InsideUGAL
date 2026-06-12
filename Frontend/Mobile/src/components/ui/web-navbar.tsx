// Navbar-ul web (DOAR web — importat doar din _layout.web.tsx, deci nu intra in
// bundle-ul de mobil). Inlocuieste bara de jos (NativeTabs) cu o bara de sus:
//   - stanga: logo
//   - dreapta: link-urile existente + meniul de tema (cog)
//
// Fundal: albastru de brand (theme.primary). Comportament pe pagini:
//   - ACASA (are hero): transparent peste hero, devine solid cand pagina a fost
//     derulata (raportat prin WebScrollProvider) -> fade lin.
//   - restul paginilor: solid mereu (nu au hero).
// Textul ramane alb in ambele stari. Aliniere: continutul sta intr-un WebContainer.
import { useEffect, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useRouter, usePathname } from "expo-router";
import { ColorScheme, Colors, Spacing } from "@/constants/theme";
import { Typography } from "@/constants/typography";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useNavbarScrolled } from "@/contexts/web-scroll-context";
import { WebContainer } from "@/components/ui/web-container";
import { ThemeMenu } from "@/components/ui/theme-menu";

export const NAVBAR_HEIGHT = 60;

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

  // Doar pagina de acasa (index) are hero -> transparent pana la scroll.
  // Sub-paginile acasa (categorie/vizualizare) si restul: solid mereu.
  const isHome = pathname === "/acasa" || pathname === "/";
  const solid = !isHome || scrolled;

  // Opacitatea fundalului solid: 0 = transparent, 1 = solid. Fade pe schimbare.
  const [bgOpacity] = useState(() => new Animated.Value(solid ? 1 : 0));
  useEffect(() => {
    Animated.timing(bgOpacity, {
      toValue: solid ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [solid, bgOpacity]);

  return (
    <View style={styles.bar} pointerEvents="box-none">
      {/* Fundal solid (albastru de brand), fade in/out dupa pagina/scroll. Full-bleed. */}
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

          {/* Dreapta: link-uri + meniu tema */}
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
                  {/* Link-urile de navbar sunt mai subtiri (Regular) decat restul
                      lucrurilor care folosesc Heading5 (etichete, butoane) — de aceea
                      suprascriem greutatea local, nu global in typography.web.ts. */}
                  <Text
                    style={[
                      Typography.Heading5,
                      { color: ColorScheme.white, fontFamily: "InstrumentSans-Regular", fontWeight: "400" },
                    ]}
                  >
                    {link.label}
                  </Text>
                  {/* Indicator pentru link-ul activ. */}
                  {isActive && <View style={styles.activeUnderline} />}
                </Pressable>
              );
            })}

            <ThemeMenu solid={solid} />
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
