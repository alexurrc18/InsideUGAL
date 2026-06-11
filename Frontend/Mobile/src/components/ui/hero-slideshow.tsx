// Hero slideshow pentru pagina Acasa pe web (folosit doar din acasa/index.web.tsx,
// deci nu intra in bundle-ul de mobil). Inlocuieste bannerul static de sus cu un
// carusel full-bleed care roteste automat ultimele anunturi.
//
// Tranzitia intre slide-uri: CROSSFADE al intregului slide (imagine + gradient +
// text impreuna). Stivuim toate slide-urile absolut si animam doar `opacity`
// fiecaruia (activ -> 1, restul -> 0). Asa textul nu mai "sare", ci se estompeaza
// lin odata cu imaginea.
//
// Comportament:
//  - schimba slide-ul automat la fiecare HERO_INTERVAL ms;
//  - puncte jos (cate unul / slide) — click pentru salt manual, care reseteaza
//    si cronometrul de auto-rotire;
//  - click pe imagine => onPressItem(slide-ul activ).
import { useEffect, useRef, useState } from "react";
import { Animated, View, Text, Pressable, StyleSheet, Easing } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { ColorScheme, Spacing } from "@/constants/theme";
import { Typography } from "@/constants/typography";
import { WebContainer } from "@/components/ui/web-container";
import { getFormattedDate } from "@/utils/date";

export const HERO_HEIGHT = 460;
const HERO_INTERVAL = 5000;
const FADE_DURATION = 550;

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

  // Cate o valoare de opacitate per slide (primul vizibil, restul ascunse).
  const opacities = useRef(slides.map((_, i) => new Animated.Value(i === 0 ? 1 : 0))).current;

  // Crossfade la schimbarea slide-ului activ: ridicam activul la 1, restul la 0.
  useEffect(() => {
    Animated.parallel(
      opacities.map((value, i) =>
        Animated.timing(value, {
          toValue: i === active ? 1 : 0,
          duration: FADE_DURATION,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false, // animam opacity pe web
        })
      )
    ).start();
  }, [active, opacities]);

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
      {/* Slide-urile stivuite: fiecare cu imaginea, gradientul si textul lui. */}
      {slides.map((slide, i) => (
        <Animated.View
          key={slide.id}
          style={[styles.slide, { opacity: opacities[i] }]}
          pointerEvents="none"
        >
          <Image
            source={slide.image ? { uri: slide.image } : require("@/assets/images/campus-stiintei.png")}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />

          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.35)", "rgba(0,0,0,0.85)"]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.content}>
            <WebContainer style={{ justifyContent: "flex-end", paddingBottom: Spacing.xl }}>
              <View style={{ paddingHorizontal: Spacing.lg }}>
                {slide.category ? (
                  <View style={styles.chip}>
                    <Text style={[Typography.Small1, { color: ColorScheme.white }]}>{slide.category}</Text>
                  </View>
                ) : null}

                <Text style={[Typography.Heading1, { color: ColorScheme.white, marginTop: Spacing.sm }]} numberOfLines={2}>
                  {slide.title}
                </Text>

                <Text style={[Typography.Paragraph2, { color: ColorScheme.white, opacity: 0.9, marginTop: Spacing.xs }]}>
                  {[getFormattedDate(slide.date), slide.author].filter(Boolean).join("  ·  ")}
                </Text>
              </View>
            </WebContainer>
          </View>
        </Animated.View>
      ))}

      {/* Umbra subtila sus: contrast pentru textul alb din navbar peste hero. */}
      <LinearGradient
        colors={["rgba(0,0,0,0.45)", "transparent"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.topShade}
        pointerEvents="none"
      />

      {/* Strat de navigare: click oriunde pe hero => deschide anuntul activ. */}
      <Pressable style={StyleSheet.absoluteFill} onPress={() => onPressItem(current)} />

      {/* Puncte: cate unul per slide, centrat jos. Deasupra stratului de navigare. */}
      <View style={styles.dotsWrap} pointerEvents="box-none">
        <View style={styles.dots}>
          {slides.map((slide, i) => {
            const isActive = i === active;
            return (
              <Pressable
                key={slide.id}
                onPress={() => setActive(i)}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={`Anunțul ${i + 1} din ${slides.length}`}
                style={({ hovered }: any) => [styles.dotHit, hovered && styles.dotHitHover]}
              >
                <View style={[styles.dot, isActive ? styles.dotActive : styles.dotInactive]} />
              </Pressable>
            );
          })}
        </View>
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
  slide: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  topShade: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 160,
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
  dotsWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: Spacing.lg,
    alignItems: "center",
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  // Zona de click (mai mare decat punctul vizual) + tranzitie lina la hover pe web.
  dotHit: {
    paddingVertical: 10,
    paddingHorizontal: 6,
    ...({ transitionDuration: "150ms", transitionProperty: "transform" } as any),
  },
  dotHitHover: {
    transform: [{ scale: 1.5 }],
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
