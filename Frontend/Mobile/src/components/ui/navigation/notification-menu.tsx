// Meniu de notificari (DOAR web — importat doar din web-navbar.tsx, care la randul
// lui e importat doar din _layout.web.tsx, deci nu intra in bundle-ul de mobil).
// Acelasi pattern ca ThemeMenu / ProfileMenu:
//   - trigger = iconita clopotel (bell.svg), cu fundal plin cand e deschis
//   - sub el cade, cu fade + slide, un panou dreptunghiular (colturi drepte + shadow)
//     ca celelalte dropdown-uri din navbar
//   - lista de notificari e scrollabila (limitam inaltimea cu maxHeight)
//   - badge cu numarul de necitite peste clopotel; "Marcheaza toate ca citite" goleste
//   - se inchide la scroll-ul PAGINII (ca ThemeMenu), DAR nu si la scroll-ul din
//     interiorul listei (altfel panoul s-ar inchide cand incerci sa derulezi)
//
// Culorile sunt legate de tema (theme.card / theme.text / ...), deci panoul reactioneaza
// la dark mode (spre deosebire de ThemeMenu / ProfileMenu, care raman albe — vezi nota
// din web-navbar daca vrem sa le aliniem).
//
// Datele sunt mock-uite local (aceeasi forma `Notificare` ca ecranul de mobil
// acasa/notificari.tsx). Nu importam din fisierul de mobil ca sa nu-l atingem; cand
// va exista un endpoint, se inlocuieste doar `MOCK_NOTIFICARI` cu un fetch.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Pressable, View, Text, ScrollView, useWindowDimensions, Linking } from "react-native";
import Animated, { useSharedValue, withTiming, useAnimatedStyle, interpolate, Extrapolation, Easing } from "react-native-reanimated";
import { ColorScheme, Spacing, Colors } from "@/constants/theme";
import { Typography } from "@/constants/typography";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { WEB_COMPACT_BREAKPOINT } from "@/components/ui/layout/web-container";
import BellIcon from "@/assets/icons/svg/bell.svg";
import { useRouter } from "expo-router";
import { NotificareCard, Notificare } from "@/components/ui/display/notificare-card";
import { storage } from "@/services/api";
import { MOCK_NOTIFICARI } from "@/app/(public)/acasa/notificari";

// MOCK_NOTIFICARI is imported from notificari.tsx

export function NotificationMenu({
  open: controlledOpen,
  onToggle,
  onClose,
}: {
  open?: boolean;
  onToggle?: () => void;
  onClose?: () => void;
}) {
  const router = useRouter();
  const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
  const theme = Colors[themeName];
  const isDark = themeName === "dark";
  const { width } = useWindowDimensions();
  const isCompact = width < WEB_COMPACT_BREAKPOINT;

  // Culori luate direct din tema (conform specificatiilor).
  const dividerColor = theme.border;
  const rowBorder = theme.border;
  const hoverBg = theme.background;
  const unreadBg = theme.background;

  const [localOpen, setLocalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : localOpen;
  const anim = useSharedValue(0); // 0 = inchis, 1 = deschis

  // Ref catre cardul panoului (pe web = nodul DOM), ca sa stim daca un scroll vine
  // din interiorul listei -> in acel caz NU inchidem panoul.
  const panelRef = useRef<View>(null);

  // Ref catre containerul trigger-ului. Pe ecran compact panoul devine o "foaie"
  // pozitionata `fixed` fata de ecran (nu fata de clopotel), ca sa nu iasa in afara.
  // Masuram marginea de jos a barei din trigger ca sa stim de unde incepe foaia
  // (asa prindem corect inaltimea barei + safe-area, fara constante hardcodate).
  const triggerRef = useRef<View>(null);
  const [sheetTop, setSheetTop] = useState(0);
  useLayoutEffect(() => {
    if (!open || !isCompact) return;
    const node = triggerRef.current as unknown as HTMLElement | null;
    if (node && typeof node.getBoundingClientRect === "function") {
      setSheetTop(node.getBoundingClientRect().bottom + Spacing.xs);
    }
  }, [open, isCompact, width]);

  // Citite/necitite tinute local (id-urile celor citite). La inceput toate sunt necitite.
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const unreadCount = MOCK_NOTIFICARI.filter((n) => !readIds.has(n.id)).length;

  useEffect(() => {
    storage.getItem('read_notification_ids').then((val) => {
      if (val) {
        try {
          const ids = JSON.parse(val);
          if (Array.isArray(ids)) {
            setReadIds(new Set(ids));
          }
        } catch (e) {
          console.error(e);
        }
      }
    });
  }, [open]);

  const toggle = () => {
    if (onToggle) onToggle();
    else setLocalOpen((v) => !v);
  };

  const close = () => {
    if (onClose) onClose();
    else setLocalOpen(false);
  };

  useEffect(() => {
    anim.set(withTiming(open ? 1 : 0, {
      duration: open ? 280 : 200,
      easing: Easing.out(Easing.cubic),
    }));
  }, [open, anim]);

  // Inchide la scroll-ul PAGINII, dar ignora scroll-ul din interiorul panoului
  // (lista de notificari) — altfel panoul s-ar inchide imediat ce incerci sa derulezi.
  // Faza de CAPTURE ca sa prindem scroll-ul din ScrollView-ul oricarei pagini.
  useEffect(() => {
    if (!open) return;
    const closeOnScroll = (e: Event) => {
      const node = panelRef.current as unknown as HTMLElement | null;
      if (node && e.target instanceof Node && node.contains(e.target)) return;
      close();
    };
    document.addEventListener("scroll", closeOnScroll, true);
    return () => document.removeEventListener("scroll", closeOnScroll, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const dropStyle = useAnimatedStyle(() => ({
    opacity: anim.value,
    transform: [{ translateY: interpolate(anim.value, [0, 1], [-8, 0], Extrapolation.CLAMP) }],
  }));

  // Latimea panoului pe ecran lat (dropdown ancorat la dreapta sub clopotel).
  const panelWidth = Math.min(360, width - 2 * Spacing.lg);

  // Pe ecran lat: dropdown clasic, ancorat la dreapta sub clopotel.
  // Pe ecran compact: "foaie" pozitionata `fixed` fata de ecran, cu margini egale
  // stanga/dreapta, ca sa nu iasa niciodata in afara (clopotelul nu e la marginea
  // ecranului, deci `right: 0` fata de el ar impinge panoul mult spre stanga).
  const panelPosition = isCompact
    ? ({ position: "fixed", top: sheetTop, left: Spacing.lg, right: Spacing.lg } as any)
    : ({ position: "absolute", top: "100%", right: 0, width: panelWidth } as const);

  const markAllRead = () => {
    const allIds = new Set(MOCK_NOTIFICARI.map((n) => n.id));
    setReadIds(allIds);
    storage.setItem('read_notification_ids', JSON.stringify(Array.from(allIds)));
  };

  return (
    <View ref={triggerRef} style={{ position: "relative", height: "100%", justifyContent: "center" }}>
      {/* Trigger: clopotel + badge cu numarul de necitite. */}
      <Pressable
        onPress={toggle}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={unreadCount > 0 ? `Notificări, ${unreadCount} necitite` : "Notificări"}
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
          <BellIcon width={24} height={24} color={ColorScheme.white} />

          {unreadCount > 0 && (
            <View
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                minWidth: 18,
                height: 18,
                paddingHorizontal: 3,
                borderRadius: 9,
                backgroundColor: theme.secondary,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: ColorScheme.white, fontSize: 10, fontFamily: "InstrumentSans-SemiBold", lineHeight: 12 }}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </Text>
            </View>
          )}
        </View>
      </Pressable>

      {/* Panoul de notificari, ancorat la dreapta sub clopotel (ca la profil/tema). */}
      <Animated.View
        pointerEvents={open ? "auto" : "none"}
        style={[panelPosition, dropStyle]}
      >
        <View
          ref={panelRef}
          style={{
            backgroundColor: theme.card,
            borderRadius: 0,
            borderWidth: 0,
            overflow: "hidden",
            shadowColor: ColorScheme.pureBlack,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: isDark ? 0.4 : 0.12,
            shadowRadius: 16,
          }}
        >
          {/* Antet: titlu + actiune "marcheaza toate ca citite". */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: Spacing.lg,
              paddingVertical: Spacing.md,
            }}
          >
            <Text style={[Typography.Heading5, { color: theme.text }]}>Notificări</Text>
            {unreadCount > 0 && (
              <Pressable onPress={markAllRead} accessibilityRole="button" hitSlop={6}>
                {({ pressed, hovered }: any) => (
                  <Text style={[Typography.Small2, { color: (pressed || hovered) ? theme.primary : theme.textSecondary }]}>
                    Marchează toate ca citite
                  </Text>
                )}
              </Pressable>
            )}
          </View>

          <View style={{ height: 1, backgroundColor: dividerColor, opacity: 0.3 }} />

          {/* Lista scrollabila (limitam inaltimea ca panoul sa nu depaseasca ecranul).
              overscrollBehavior: contain -> scroll-ul listei nu "scapa" la pagina cand
              ajunge la capat. */}
          {MOCK_NOTIFICARI.length === 0 ? (
            <View style={{ paddingHorizontal: Spacing.lg, paddingVertical: Spacing.xl, alignItems: "center" }}>
              <Text style={[Typography.Paragraph2, { color: theme.textSecondary }]}>Nu ai notificări.</Text>
            </View>
          ) : (
            <ScrollView
              style={{ maxHeight: 360, ...({ overscrollBehavior: "contain" } as any) }}
              showsVerticalScrollIndicator={false}
            >
              {MOCK_NOTIFICARI.map((item, idx) => {
                const isUnread = !readIds.has(item.id);
                return (
                  <NotificareCard
                    key={item.id}
                    item={item}
                    theme={theme}
                    isUnread={isUnread}
                    onPress={() => {
                      const updated = new Set(readIds).add(item.id);
                      setReadIds(updated);
                      storage.setItem('read_notification_ids', JSON.stringify(Array.from(updated)));
                      if (item.actiune) {
                        const isWeb = item.actiune.startsWith("http://") || item.actiune.startsWith("https://");
                        const isInternalDomain = item.actiune.includes("inside.ugal.ro");
                        if (isWeb && !isInternalDomain) {
                          Linking.openURL(item.actiune).catch((err) => console.error("Couldn't open URL", err));
                        } else {
                          router.push(item.actiune as any);
                        }
                        close();
                      }
                    }}
                    showDivider={idx > 0}
                    hoverBg={hoverBg}
                    unreadBg={unreadBg}
                  />
                );
              })}
            </ScrollView>
          )}
        </View>
      </Animated.View>
    </View>
  );
}
