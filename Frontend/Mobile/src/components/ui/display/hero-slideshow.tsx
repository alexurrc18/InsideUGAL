import { useEffect, useState, useRef } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, useWindowDimensions, NativeSyntheticEvent, NativeScrollEvent, Animated } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { ColorScheme, Spacing } from "@/constants/theme";
import { Typography } from "@/constants/typography";
import { getFormattedDate } from "@/utils/date";
import { CategoryTag } from "@/components/ui/display/news-card";

import { HERO_INTERVAL, HERO_HEIGHT_MOBILE as HERO_HEIGHT } from "./hero-config";

export { HERO_HEIGHT };

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
  scrollY?: Animated.Value;
}

export function HeroSlideshow({ slides, onPressItem, scrollY }: HeroSlideshowProps) {
  const { width: windowWidth } = useWindowDimensions();
  const [active, setActive] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const autoRotateTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const startAutoRotate = () => {
    stopAutoRotate();
    if (slides.length <= 1) return;
    autoRotateTimer.current = setInterval(() => {
      const nextIndex = (active + 1) % slides.length;
      scrollRef.current?.scrollTo({ x: nextIndex * windowWidth, animated: true });
    }, HERO_INTERVAL);
  };

  const stopAutoRotate = () => {
    if (autoRotateTimer.current) {
      clearInterval(autoRotateTimer.current);
    }
  };

  useEffect(() => {
    startAutoRotate();
    return () => stopAutoRotate();
  }, [active, slides.length, windowWidth]);

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / windowWidth);
    if (index !== active) {
      setActive(index);
    }
  };

  const scale = scrollY ? scrollY.interpolate({
    inputRange: [-150, 0],
    outputRange: [1.25, 1],
    extrapolate: "clamp"
  }) : 1;

  if (slides.length === 0) return null;

  return (
    <View style={[styles.container, { height: HERO_HEIGHT }]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onScrollBeginDrag={stopAutoRotate}
        onScrollEndDrag={startAutoRotate}
      >
        {slides.map((slide) => (
          <Pressable
            key={slide.id}
            style={{ width: windowWidth, height: HERO_HEIGHT, overflow: "hidden" }}
            onPress={() => onPressItem(slide)}
          >
            <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale }] }]}>
              <Image
                source={slide.image ? { uri: slide.image } : require("@/assets/images/campus-stiintei.png")}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
              />
            </Animated.View>

            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.35)", "rgba(0,0,0,0.8)"]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFill}
            />

            <View style={styles.content}>
              <View style={{ paddingHorizontal: Spacing.lg, paddingBottom: 40 }}>
                {!!slide.category && <CategoryTag category={slide.category} />}

                <Text
                  style={[
                    Typography.Heading2,
                    { color: ColorScheme.white, marginTop: Spacing.xs }
                  ]}
                  numberOfLines={2}
                >
                  {slide.title}
                </Text>

                <Text style={[Typography.Paragraph2, { color: ColorScheme.white, opacity: 0.8, marginTop: Spacing.xxs }]}>
                  {[getFormattedDate(slide.date), slide.author].filter(Boolean).join("  ·  ")}
                </Text>
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.dotsWrap} pointerEvents="none">
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === active ? styles.dotActive : styles.dotInactive
              ]}
            />
          ))}
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
  content: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "flex-end",
  },
  dotsWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: Spacing.md,
    alignItems: "center",
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 18,
    backgroundColor: ColorScheme.white,
  },
  dotInactive: {
    width: 6,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
});
