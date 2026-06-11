// Hero slideshow pentru pagina Acasa pe web (folosit doar din acasa/index.web.tsx,
// deci nu intra in bundle-ul de mobil). Inlocuieste bannerul static de sus cu un
// carusel full-bleed care roteste automat ultimele anunturi.
//
// Comportament:
//  - imagine full-bleed cu gradient jos pentru lizibilitatea textului;
//  - schimba slide-ul automat la fiecare HERO_INTERVAL ms (crossfade prin
//    `transition` de la expo-image);
//  - puncte jos (cate unul / slide) — click pentru salt manual, care reseteaza
//    si cronometrul de auto-rotire;
//  - click pe imagine => onPressItem(slide-ul activ).
import { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { ColorScheme, Spacing } from "@/constants/theme";
import { Typography } from "@/constants/typography";
import { WebContainer } from "@/components/ui/web-container";
import { getFormattedDate } from "@/utils/date";

export const HERO_HEIGHT = 460;
const HERO_INTERVAL = 5000;

export interface HeroSlide {
  id: string;
  title: string;
  category?: string;
  date?: string;
  author?: string;
  image?: string;
}

interface HeroSlideshowProps {
  slides: HeroSlide[];
  onPressItem: (slide: HeroSlide) => void;
}

export function HeroSlideshow({ slides, onPressItem }: HeroSlideshowProps) {
  const [active, setActive] = useState(0);

  // Auto-rotire: un timeout per slide. Cand `active` se schimba (auto sau manual),
  // efectul se re-ruleaza si cronometrul reporneste de la zero.
  useEffect(() => {
    if (slides.length <= 1) return;
    const id = setTimeout(() => {
      setActive((i) => (i + 1) % slides.length);
    }, HERO_INTERVAL);
    return () => clearTimeout(id);
  }, [active, slides.length]);

  if (slides.length === 0) return null;

  const current = slides[active];

  return (
    <View style={[styles.container, { height: HERO_HEIGHT }]}>
      {/* Imaginea activa. `transition` => crossfade automat la schimbarea sursei. */}
      <Image
        source={current.image ? { uri: current.image } : require("@/assets/images/campus-stiintei.png")}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={400}
      />

      {/* Gradient jos pentru contrast cu textul. */}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.35)", "rgba(0,0,0,0.85)"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Strat de navigare: click oriunde pe hero => deschide anuntul activ. */}
      <Pressable style={StyleSheet.absoluteFill} onPress={() => onPressItem(current)} />

      {/* Strat de continut: text (nu capteaza click-uri) + puncte (captureaza). */}
      <View style={styles.content} pointerEvents="box-none">
        <WebContainer style={{ justifyContent: "flex-end", paddingBottom: Spacing.xl }}>
          <View style={{ paddingHorizontal: Spacing.lg }} pointerEvents="none">
            {current.category ? (
              <View style={styles.chip}>
                <Text style={[Typography.Small1, { color: ColorScheme.white }]}>
                  {current.category}
                </Text>
              </View>
            ) : null}

            <Text style={[Typography.Heading1, { color: ColorScheme.white, marginTop: Spacing.sm }]} numberOfLines={2}>
              {current.title}
            </Text>

            <Text style={[Typography.Paragraph2, { color: ColorScheme.white, opacity: 0.9, marginTop: Spacing.xs }]}>
              {[getFormattedDate(current.date), current.author].filter(Boolean).join("  ·  ")}
            </Text>
          </View>

          {/* Puncte: cate unul per slide, centrat. */}
          <View style={styles.dots}>
            {slides.map((slide, i) => {
              const isActive = i === active;
              return (
                <Pressable
                  key={slide.id}
                  onPress={() => setActive(i)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Anunțul ${i + 1} din ${slides.length}`}
                >
                  <View style={[styles.dot, isActive ? styles.dotActive : styles.dotInactive]} />
                </Pressable>
              );
            })}
          </View>
        </WebContainer>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    position: "relative",
    overflow: "hidden",
  },
  content: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "flex-end",
  },
  chip: {
    alignSelf: "flex-start",
    backgroundColor: ColorScheme.red,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: 999,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: ColorScheme.white,
  },
  dotInactive: {
    width: 8,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
});
