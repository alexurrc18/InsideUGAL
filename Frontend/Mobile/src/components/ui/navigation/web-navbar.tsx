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
import { useEffect, useRef, useState } from "react";
import { Animated, Linking, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ColorScheme, Colors, Spacing, WebContentMaxWidth, WebMaxScale } from "@/constants/theme";
import { Typography } from "@/constants/typography";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useNavbarScrolled } from "@/contexts/web-scroll-context";
import { WebContainer, WEB_COMPACT_BREAKPOINT } from "@/components/ui/layout/web-container";
import { ThemeMenu } from "@/components/ui/navigation/theme-menu";
import { ThemeToggle } from "@/components/ui/navigation/theme-toggle";
import { ProfileMenu, DASHBOARD_URL } from "@/components/ui/navigation/profile-menu";
import ChevronIcon from "@/assets/icons/svg/chevron-left.svg";
import api, { getAuthToken, setAuthToken } from "@/services/api";

export const NAVBAR_HEIGHT = 72;

const LOGO = require("@/assets/images/logo.png");

// Link-urile = aceleasi destinatii care erau in NativeTabs. `match` e segmentul cu
// care comparam pathname-ul (care vine fara grupul "(public)") ca sa stim activul.
// `exact` -> activ doar pe potrivire exacta (Acasă, ca sa nu se aprinda si pe
// sub-paginile /acasa/...). `dropdown` -> element cu sub-meniu la hover (Anunțuri).
type NavItem = {
  label: string;
  href?: string;
  match: string;
  exact?: boolean;
  dropdown?: { label: string; href: string }[];
};

const LINKS: NavItem[] = [
  { label: "Acasă", href: "/(public)/acasa", match: "/acasa", exact: true },
  {
    label: "Anunțuri",
    match: "/acasa/categorie",
    dropdown: [
      { label: "Noutăți", href: "/(public)/acasa/categorie?title=Noutăți" },
      { label: "Evenimente", href: "/(public)/acasa/categorie?title=Evenimente" },
    ],
  },
  { label: "Hartă", href: "/(public)/harta", match: "/harta" },
  { label: "Cantină", href: "/(public)/cantina", match: "/cantina" },
  { label: "Sesizări", href: "/(public)/sesizari", match: "/sesizari" },
  { label: "Mai multe", href: "/(public)/more", match: "/more" },
];

// Activ daca pathname-ul se potriveste cu segmentul link-ului.
function isLinkActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.match || pathname === "/";
  return pathname.startsWith(item.match);
}

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
  const insets = useSafeAreaInsets();
  const isCompact = width < WEB_COMPACT_BREAKPOINT;

  // Pe ecrane late WebContainer-ul scaleaza continutul (zoom), deci bara e vizual
  // mai inalta de NAVBAR_HEIGHT. Reproducem zoom-ul ca sa o ascundem complet.
  const zoom = width > WebContentMaxWidth ? Math.min(width / WebContentMaxWidth, WebMaxScale) : 1;

  const [menuOpen, setMenuOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<"theme" | "profile" | null>(null);
  // Hide-on-scroll: bara ascunsa la scroll in jos, vizibila la scroll in sus.
  const [hidden, setHidden] = useState(false);
  // Pozitia de scroll de la ultimul event (ref, ca sa o putem reseta la navigare).
  const lastYRef = useRef(0);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);

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
        console.warn("[API] Error loading profile for web-navbar:", err);
        if (isMounted) {
          setIsAuthenticated(false);
          setUser(null);
        }
      }
    };

    checkUser();

    return () => {
      isMounted = false;
    };
  }, [pathname, menuOpen]);

  const handleLinkPress = async (href: string) => {
    if (href === "/(public)/sesizari") {
      const token = await getAuthToken();
      if (!token) {
        router.push("/(auth)");
        return;
      }
    }
    router.push(href as any);
  };

  // Inchidem panoul cand navigam catre alta pagina sau cand ecranul devine lat.
  // Ajustam in timpul randarii (pattern recomandat de React pentru "state derivat
  // dintr-o schimbare de prop") in loc de setState intr-un useEffect, care declanseaza
  // re-randari in cascada (regula react-hooks/set-state-in-effect).
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    if (menuOpen) setMenuOpen(false);
    if (activeMenu) setActiveMenu(null);
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

  // Hide-on-scroll: bara se ascunde la scroll in jos si reapare la scroll in sus.
  // Scroll-ul se intampla in interiorul ScrollView-urilor fiecarei pagini (nu in
  // fereastra), asa ca ascultam evenimentul `scroll` in faza de CAPTURE pe
  // document — prinde scroll-ul din orice container, fara sa cablam fiecare pagina.
  useEffect(() => {
    const onScroll = (e: Event) => {
      const el = e.target as HTMLElement | null;
      if (!el || typeof el.scrollTop !== "number") return;
      const y = el.scrollTop;
      if (y <= NAVBAR_HEIGHT) {
        setHidden(false); // langa varf ramane mereu vizibila
      } else if (y > lastYRef.current + 4) {
        setHidden(true); // scroll in jos
      } else if (y < lastYRef.current - 4) {
        setHidden(false); // scroll in sus
      }
      lastYRef.current = y;
    };
    document.addEventListener("scroll", onScroll, true);
    return () => document.removeEventListener("scroll", onScroll, true);
  }, []);

  // La fiecare schimbare de pagina, navbar-ul reapare si resetam baseline-ul de
  // scroll. Altfel, daca pleci de pe o pagina cu navbar-ul ascuns (derulat in jos)
  // catre una scurta (fara scroll), ar ramane ascuns fara cale de revenire.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHidden(false);
    lastYRef.current = 0;
  }, [pathname]);

  // Translatam bara in sus cand e ascunsa (dar nu cand panoul hamburger e deschis).
  const [hideAnim] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(hideAnim, {
      toValue: hidden && !menuOpen ? -(NAVBAR_HEIGHT * zoom + 8) : 0,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [hidden, menuOpen, hideAnim, zoom]);

  return (
    <Animated.View style={[styles.bar, { transform: [{ translateY: hideAnim }] }]} pointerEvents="box-none">
      {/* Cand navbarul e transparent (peste hero), un gradient negru sus->transparent
          jos da contrast textului alb. Sta SUB fundalul albastru: cand bara devine
          solida, albastrul (opacity 1) il acopera complet. Extins in sus cu insets.top. */}
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(0,0,0,0.8)", "rgba(0,0,0,0)"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[StyleSheet.absoluteFill, { top: -insets.top }]}
      />

      {/* Fundal solid (albastru de brand), fade in/out dupa pagina/scroll. Full-bleed.
          Il extindem in sus cu insets.top ca albastrul sa acopere si zona de
          safe-area (status bar / notch), nu doar bara — altfel ramane o fasie
          inchisa deasupra navbar-ului pe telefon. */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            top: -insets.top,
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
                const isActive = isLinkActive(pathname, link);

                // Element cu dropdown (Anunțuri): la hover cade meniul (global.css).
                if (link.dropdown) {
                  return (
                    <View
                      key={link.label}
                      {...({ dataSet: { navdropdown: "true" } } as any)}
                      style={{ position: "relative", justifyContent: "center", height: NAVBAR_HEIGHT }}
                    >
                      <Pressable
                        onPress={() => router.push(link.dropdown![0].href as any)}
                        accessibilityRole="link"
                        {...({ dataSet: { navlink: "true", active: isActive ? "true" : "false" } } as any)}
                        style={({ pressed }) => ({
                          opacity: pressed ? 0.6 : 1,
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 2,
                        })}
                      >
                        <Text style={[Typography.Heading5, { color: ColorScheme.white }]}>{link.label}</Text>
                        <View style={{ transform: [{ rotate: "-90deg" }] }}>
                          <ChevronIcon width={20} height={20} fill={ColorScheme.white} color={ColorScheme.white} />
                        </View>
                      </Pressable>

                      <View
                        {...({ dataSet: { dropdownMenu: "true" } } as any)}
                        style={styles.dropdown}
                      >
                        {link.dropdown.map((sub) => (
                          <Pressable
                            key={sub.href}
                            onPress={() => router.push(sub.href as any)}
                            accessibilityRole="link"
                            style={({ pressed, hovered }: any) => [
                              styles.dropdownItem,
                              (pressed || hovered) && { backgroundColor: "rgba(0, 0, 0, 0.05)" },
                            ]}
                          >
                            {({ pressed, hovered }: any) => (
                              <Text
                                style={[
                                  Typography.Heading5,
                                  { color: (pressed || hovered) ? theme.primary : ColorScheme.black },
                                ]}
                              >
                                {sub.label}
                              </Text>
                            )}
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  );
                }

                // Link normal. Activul e indicat prin sublinierea din global.css.
                return (
                  <Pressable
                    key={link.href}
                    onPress={() => handleLinkPress(link.href!)}
                    accessibilityRole="link"
                    {...({ dataSet: { navlink: "true", active: isActive ? "true" : "false" } } as any)}
                    style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, alignItems: "center", justifyContent: "center" })}
                  >
                    <Text style={[Typography.Heading5, { color: ColorScheme.white }]}>{link.label}</Text>
                  </Pressable>
                );
              })}

              <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.xs, marginLeft: Spacing.xl3 }}>
                <ThemeMenu
                  solid={solid}
                  open={activeMenu === "theme"}
                  onToggle={() => setActiveMenu(activeMenu === "theme" ? null : "theme")}
                  onClose={() => activeMenu === "theme" && setActiveMenu(null)}
                />
                <ProfileMenu
                  open={activeMenu === "profile"}
                  onToggle={() => setActiveMenu(activeMenu === "profile" ? null : "profile")}
                  onClose={() => activeMenu === "profile" && setActiveMenu(null)}
                />
              </View>
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
              // Pe mobil, elementul cu dropdown (Anunțuri) se desfasoara in sub-link-uri.
              if (link.dropdown) {
                return (
                  <View key={link.label}>
                    {link.dropdown.map((sub) => (
                      <Pressable
                        key={sub.href}
                        onPress={() => {
                          router.push(sub.href as any);
                          setMenuOpen(false);
                        }}
                        accessibilityRole="link"
                        style={({ pressed }) => [styles.panelLink, { opacity: pressed ? 0.6 : 1 }]}
                      >
                        <Text style={[Typography.Heading3, { color: ColorScheme.white, fontFamily: "InstrumentSans-Medium" }]}>
                          {sub.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                );
              }

              const isActive = isLinkActive(pathname, link);
              return (
                <Pressable
                  key={link.href}
                  onPress={() => {
                    handleLinkPress(link.href!);
                    setMenuOpen(false);
                  }}
                  accessibilityRole="link"
                  style={({ pressed }) => [styles.panelLink, { opacity: pressed ? 0.6 : 1 }]}
                >
                  <Text
                    style={[
                      Typography.Heading3,
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
              <Text style={[Typography.Heading3, { color: ColorScheme.white }]}>Temă</Text>
              <ThemeToggle
                size={20}
                backgroundColor="rgba(255,255,255,0.15)"
                borderColor={ColorScheme.white}
                color={ColorScheme.white}
              />
            </View>

            {/* Profil (mobil): cine e conectat + Dashboard (daca are acces) + Deconectare. */}
            <View style={styles.panelProfile}>
              <Text style={[Typography.Heading3, { color: ColorScheme.white }]} numberOfLines={1}>
                {isAuthenticated ? (user?.name || "Utilizator") : "Neautentificat"}
              </Text>
              {isAuthenticated && user?.email ? (
                <Text style={[Typography.Small1, { color: "rgba(255,255,255,0.7)" }]} numberOfLines={1}>
                  {user.email}
                </Text>
              ) : null}
            </View>
            {isAuthenticated && (
              <Pressable
                onPress={() => {
                  setMenuOpen(false);
                  Linking.openURL(DASHBOARD_URL).catch(() => {});
                }}
                style={({ pressed }) => [styles.panelLink, { opacity: pressed ? 0.6 : 1 }]}
              >
                <Text style={[Typography.Heading3, { color: ColorScheme.white, fontFamily: "InstrumentSans-Medium" }]}>
                  Dashboard
                </Text>
              </Pressable>
            )}
            {isAuthenticated ? (
              <Pressable
                onPress={async () => {
                  setMenuOpen(false);
                  await setAuthToken(null);
                  setIsAuthenticated(false);
                  setUser(null);
                  router.push("/(public)/acasa");
                }}
                style={({ pressed }) => [styles.panelLink, { opacity: pressed ? 0.6 : 1 }]}
              >
                <Text style={[Typography.Heading3, { color: ColorScheme.white, fontFamily: "InstrumentSans-Medium" }]}>
                  Deconectare
                </Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => {
                  setMenuOpen(false);
                  router.push("/(auth)");
                }}
                style={({ pressed }) => [styles.panelLink, { opacity: pressed ? 0.6 : 1 }]}
              >
                <Text style={[Typography.Heading3, { color: ColorScheme.white, fontFamily: "InstrumentSans-Medium" }]}>
                  Autentificare
                </Text>
              </Pressable>
            )}
          </WebContainer>
        </Animated.View>
      )}
    </Animated.View>
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
    height: 48,
    width: 48,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xl,
  },
  // Meniul "Anunțuri" (desktop): apare sub element. Vizibilitatea o face global.css
  // (la hover pe containerul [data-navdropdown]). Colturi drepte, chenar subtil si
  // umbra discreta; fundal solid (primary) ca sa fie lizibil si peste hero.
  dropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    paddingVertical: Spacing.xs,
    borderRadius: 0,
    backgroundColor: ColorScheme.pureWhite,
    borderWidth: 0,
    minWidth: 180,
    overflow: "hidden",
    shadowColor: ColorScheme.pureBlack,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
  },
  dropdownItem: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
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
  panelProfile: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    marginTop: Spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.25)",
    gap: 2,
  },
});

const hamburger = StyleSheet.create({
  box: {
    width: 28,
    height: 20,
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
    transform: [{ translateY: 9 }, { rotate: "45deg" }],
  },
  barMid: {
    opacity: 0,
  },
  barBottom: {
    transform: [{ translateY: -9 }, { rotate: "-45deg" }],
  },
});
