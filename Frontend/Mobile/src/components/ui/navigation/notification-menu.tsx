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
import { Pressable, View, Text, ScrollView, useWindowDimensions } from "react-native";
import Animated, { useSharedValue, withTiming, useAnimatedStyle, interpolate, Extrapolation, Easing } from "react-native-reanimated";
import { ColorScheme, Spacing, Colors } from "@/constants/theme";
import { Typography } from "@/constants/typography";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { WEB_COMPACT_BREAKPOINT } from "@/components/ui/layout/web-container";
import BellIcon from "@/assets/icons/svg/bell.svg";

interface Notificare {
  id: string;
  data: string;
  titlu: string;
  continut: string;
}

const MOCK_NOTIFICARI: Notificare[] = [
  {
    id: "1",
    data: "27 iunie 2026",
    titlu: "Rezultate sesiune de vară",
    continut: "Rezultatele pentru sesiunea de examene de vară au fost publicate în Registrul Matricol. Vă rugăm să verificați situația academică.",
  },
  {
    id: "2",
    data: "25 iunie 2026",
    titlu: "Eveniment: Ziua Porților Deschise",
    continut: "Universitatea Dunărea de Jos organizează Ziua Porților Deschise pe 30 iunie 2026, începând cu ora 10:00, în Campusul Științei.",
  },
  {
    id: "3",
    data: "20 iunie 2026",
    titlu: "Întrerupere servicii IT",
    continut: "Pe data de 22 iunie 2026, între orele 22:00 și 02:00, platforma academică va fi indisponibilă pentru lucrări de mentenanță.",
  },
  {
    id: "4",
    data: "15 iunie 2026",
    titlu: "Bursele pentru semestrul II",
    continut: "Au fost aprobate listele de burse pentru semestrul al II-lea al anului universitar 2025-2026. Verificați lista afișată la secretariat.",
  },
  {
    id: "5",
    data: "12 iunie 2026",
    titlu: "Înscrieri la cazare",
    continut: "Perioada de înscriere pentru cazarea în căminele studențești a început. Depuneți cererea online până pe 30 iunie 2026.",
  },
  {
    id: "6",
    data: "8 iunie 2026",
    titlu: "Concurs de proiecte studențești",
    continut: "Te invităm să participi la concursul anual de proiecte studențești. Premii și mentorat pentru cele mai bune idei.",
  },
  {
    id: "7",
    data: "3 iunie 2026",
    titlu: "Program bibliotecă în sesiune",
    continut: "Pe perioada sesiunii, biblioteca universitară are program prelungit, de luni până sâmbătă, între orele 8:00 și 22:00.",
  },
];

export function NotificationMenu({
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
  const isDark = themeName === "dark";
  const { width } = useWindowDimensions();
  const isCompact = width < WEB_COMPACT_BREAKPOINT;

  // Culori derivate din tema, ca panoul sa arate corect si pe dark.
  const dividerColor = isDark ? "rgba(255,255,255,0.12)" : "#E5E7EB";
  const rowBorder = isDark ? "rgba(255,255,255,0.08)" : "#F1F1F1";
  const hoverBg = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)";
  const unreadBg = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,48,92,0.05)";

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

  const markAllRead = () => setReadIds(new Set(MOCK_NOTIFICARI.map((n) => n.id)));

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
                top: 2,
                right: 2,
                minWidth: 16,
                height: 16,
                paddingHorizontal: 3,
                borderRadius: 8,
                backgroundColor: ColorScheme.red,
                borderWidth: 1.5,
                borderColor: theme.primary,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: ColorScheme.white, fontSize: 9, fontFamily: "InstrumentSans-SemiBold", lineHeight: 11 }}>
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
            borderWidth: isDark ? 1 : 0,
            borderColor: dividerColor,
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

          <View style={{ height: 1, backgroundColor: dividerColor }} />

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
                  <Pressable
                    key={item.id}
                    onPress={() => setReadIds((prev) => new Set(prev).add(item.id))}
                    accessibilityRole="button"
                    style={({ pressed, hovered }: any) => [
                      {
                        paddingHorizontal: Spacing.lg,
                        paddingVertical: Spacing.md,
                        gap: 4,
                        borderTopWidth: idx === 0 ? 0 : 1,
                        borderTopColor: rowBorder,
                      },
                      isUnread && { backgroundColor: unreadBg },
                      (pressed || hovered) && { backgroundColor: hoverBg },
                    ]}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: Spacing.sm }}>
                      <Text style={[Typography.Small2, { color: theme.textSecondary }]}>{item.data}</Text>
                      {isUnread && (
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.primary }} />
                      )}
                    </View>
                    <Text
                      style={[
                        Typography.Heading5,
                        { color: theme.text, fontFamily: isUnread ? "InstrumentSans-SemiBold" : "InstrumentSans-Medium" },
                      ]}
                    >
                      {item.titlu}
                    </Text>
                    <Text style={[Typography.Paragraph2, { color: theme.textSecondary, lineHeight: 20 }]} numberOfLines={3}>
                      {item.continut}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>
      </Animated.View>
    </View>
  );
}
