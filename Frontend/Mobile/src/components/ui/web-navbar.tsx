// Navbar-ul web (DOAR web — importat doar din _layout.web.tsx, deci nu intra in
// bundle-ul de mobil). Inlocuieste bara de jos (NativeTabs) cu o bara de sus:
//   - stanga: logo
//   - dreapta (ecran lat): link-urile + meniul de tema (cog)
//   - dreapta (ecran ingust < 768): un buton hamburger care deschide un panou
//     vertical cu link-urile + comutatorul de tema.
//
// Fundal: albastru de brand (theme.primary). Comportament pe pagini:
//   - ACASA (are hero): transparent peste hero, devine solid cand pagina a fost
//     derulata (raportat prin WebScrollProvider) -> fade lin.
//   - restul paginilor: solid mereu (nu au hero).
//   - cand panoul hamburger e deschis, bara devine solida ca textul sa fie lizibil.
// Textul ramane alb in toate starile. Aliniere: continutul sta intr-un WebContainer.
import { useEffect, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { useRouter, usePathname } from "expo-router";
import { ColorScheme, Colors, Spacing } from "@/constants/theme";
import { Typography } from "@/constants/typography";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useNavbarScrolled } from "@/contexts/web-scroll-context";
import { WebContainer, WEB_COMPACT_BREAKPOINT } from "@/components/ui/web-container";
import { ThemeMenu } from "@/components/ui/theme-menu";
import { ThemeToggle } from "@/components/ui/theme-toggle";

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

// Hamburger din 3 bare (nu avem icon dedicat in assets). Devine "X" cand e deschis:
// bara de sus si de jos se rotesc, cea din mijloc dispare.
function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <View style={hamburger.box}>
      <View style={[hamburger.bar, open && hamburger.barTop]} />
      <View style={[hamburger.bar, open && hamburger.barMid]} />
      <View style={[hamburger.bar, open && hamburger.barBottom]} />
    </View>
  );
}

export function WebNavbar() {
  const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
  const theme = Colors[themeName];
  const scrolled = useNavbarScrolled();
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const isCompact = width < WEB_COMPACT_BREAKPOINT;

  const [menuOpen, setMenuOpen] = useState(false);

  // Inchidem panoul cand navigam catre alta pagina sau cand ecranul devine lat.
  // Ajustam in timpul randarii (pattern recomandat de React pentru "state derivat
  // dintr-o schimbare de prop") in loc de setState intr-un useEffect, care declanseaza
  // re-randari in cascada (regula react-hooks/set-state-in-effect).
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    if (menuOpen) setMenuOpen(false);
  }
  if (!isCompact && menuOpen) {
    setMenuOpen(false);
  }

  // Doar pagina de acasa (index) are hero -> transparent pana la scroll.
  const isHome = pathname === "/acasa" || pathname === "/";
  // Bara e solida daca: nu suntem pe hero / s-a derulat / panoul hamburger e deschis.
  const solid = !isHome || scrolled || (isCompact && menuOpen);

  // Opacitatea fundalului solid: 0 = transparent, 1 = solid. Fade pe schimbare.
  const [bgOpacity] = useState(() => new Animated.Value(solid ? 1 : 0));
  useEffect(() => {
    Animated.timing(bgOpacity, {
      toValue: solid ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [solid, bgOpacity]);

  // Animatia panoului hamburger (fade + slide in jos).
  const [panelAnim] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(panelAnim, {
      toValue: menuOpen ? 1 : 0,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [menuOpen, panelAnim]);
  const panelTranslate = panelAnim.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] });

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

          {isCompact ? (
            /* Ecran ingust: doar butonul hamburger. */
            <Pressable
              onPress={() => setMenuOpen((v) => !v)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={menuOpen ? "Închide meniul" : "Deschide meniul"}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: Spacing.xs })}
            >
              <HamburgerIcon open={menuOpen} />
            </Pressable>
          ) : (
            /* Ecran lat: link-uri + meniu tema */
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
                    <Text style={[Typography.Heading5, { color: ColorScheme.white }]}>{link.label}</Text>
                    {isActive && <View style={styles.activeUnderline} />}
                  </Pressable>
                );
              })}

              <ThemeMenu solid={solid} />
            </View>
          )}
        </View>
      </WebContainer>

      {/* Panou hamburger (doar ecran ingust): lista verticala de link-uri + tema. */}
      {isCompact && (
        <Animated.View
          pointerEvents={menuOpen ? "auto" : "none"}
          style={[
            styles.panel,
            { backgroundColor: theme.primary, opacity: panelAnim, transform: [{ translateY: panelTranslate }] },
          ]}
        >
          <WebContainer style={{ paddingVertical: Spacing.sm }}>
            {LINKS.map((link) => {
              const isActive = pathname.startsWith(link.match);
              return (
                <Pressable
                  key={link.href}
                  onPress={() => {
                    router.push(link.href as any);
                    setMenuOpen(false);
                  }}
                  accessibilityRole="link"
                  style={({ pressed }) => [styles.panelLink, { opacity: pressed ? 0.6 : 1 }]}
                >
                  <Text
                    style={[
                      Typography.Heading5,
                      { color: ColorScheme.white, fontFamily: isActive ? "InstrumentSans-SemiBold" : "InstrumentSans-Medium" },
                    ]}
                  >
                    {link.label}
                  </Text>
                </Pressable>
              );
            })}

            {/* Rand de tema: eticheta + comutator soare/luna. */}
            <View style={styles.panelThemeRow}>
              <Text style={[Typography.Heading5, { color: ColorScheme.white }]}>Temă</Text>
              <ThemeToggle
                size={20}
                backgroundColor="rgba(255,255,255,0.15)"
                borderColor={ColorScheme.white}
                color={ColorScheme.white}
              />
            </View>
          </WebContainer>
        </Animated.View>
      )}
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
    // Acelasi padding suplimentar ca randul de titlu al caruselului (Spacing.lg),
    // peste padding-ul lateral al WebContainer-ului => aliniere cu "Noutăți".
    paddingHorizontal: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logo: {
    height: 40,
    width: 40,
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
  // Panoul hamburger sta lipit sub bara. Il urcam 1px (suprapunere peste bara) ca
  // sa nu ramana o linie transparenta intre bara si panou la densitati de pixeli
  // fractionare pe mobil — ambele au acelasi fundal cand panoul e deschis, deci
  // suprapunerea e invizibila.
  panel: {
    position: "absolute",
    top: NAVBAR_HEIGHT - 1,
    left: 0,
    right: 0,
    paddingBottom: Spacing.sm,
    shadowColor: ColorScheme.pureBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  panelLink: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  panelThemeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    marginTop: Spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.25)",
  },
});

const hamburger = StyleSheet.create({
  box: {
    width: 24,
    height: 18,
    justifyContent: "space-between",
  },
  bar: {
    height: 2,
    width: "100%",
    borderRadius: 1,
    backgroundColor: ColorScheme.white,
  },
  // Stari pentru "X": bara de sus coboara+roteste, mijlocul dispare, jos urca+roteste.
  barTop: {
    transform: [{ translateY: 8 }, { rotate: "45deg" }],
  },
  barMid: {
    opacity: 0,
  },
  barBottom: {
    transform: [{ translateY: -8 }, { rotate: "-45deg" }],
  },
});
