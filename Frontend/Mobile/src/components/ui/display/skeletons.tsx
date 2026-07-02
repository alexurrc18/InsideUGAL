// Skeleton loaders pentru WEB (folosite doar din paginile *.web.tsx, deci nu intra
// in bundle-ul de mobil — la fel ca `home-highlights.tsx`).
//
// "Skeleton screen" = in loc de un spinner, aratam forma continutului (dreptunghiuri
// gri care pulseaza) cat timp datele se incarca din backend. Cand vin datele,
// inlocuim skeleton-ul cu continutul real (vezi `{loading ? <...Skeleton/> : <...>}`).
//
// Fiecare `...Skeleton` reproduce layout-ul componentei reale corespondente, ca sa
// nu "sara" pagina cand apar datele:
//   NewsCard          -> NewsCardSkeleton
//   Carousel          -> CarouselSkeleton
//   HomeHighlights    -> HomeHighlightsSkeleton
//   HeroSlideshow     -> HeroSkeleton
//   SesizareCard      -> SesizareCardSkeleton
//   meniul cantinei   -> CantinaMenuSkeleton
import { useEffect } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, { useSharedValue, withTiming, withRepeat, withSequence, useAnimatedStyle, cancelAnimation, Easing } from 'react-native-reanimated';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { WebContainer } from '@/components/ui/layout/web-container';
import { HERO_HEIGHT } from '@/components/ui/display/hero-slideshow.web';
import { CAROUSEL_CARD_WIDTH, CAROUSEL_CARD_MARGIN } from '@/components/ui/display/carousel/carousel.shared';

const CARD_RATIO = 16 / 10;

function useSkeletonTheme() {
  const themeName = (useColorScheme() ?? 'light') as keyof typeof Colors;
  return Colors[themeName];
}

// ── Caramida de baza: un dreptunghi gri care pulseaza (opacity 0.4 <-> 1). ──────
export interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  radius?: number;
  style?: any;
}

export function Skeleton({ width = '100%', height = 16, radius = 8, style }: SkeletonProps) {
  const theme = useSkeletonTheme();
  const pulse = useSharedValue(0.4);

  useEffect(() => {
    pulse.set(withRepeat(
      withSequence(
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.4, { duration: 700, easing: Easing.inOut(Easing.ease) })
      ),
      -1
    ));
    return () => cancelAnimation(pulse);
  }, [pulse]);

  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height: height as any,
          borderRadius: radius,
          backgroundColor: theme.text + '18',
        },
        pulseStyle,
        style,
      ]}
    />
  );
}

// ── NewsCard ───────────────────────────────────────────────────────────────────
interface NewsCardSkeletonProps {
  variant?: 'card' | 'list' | 'square';
  width?: number | string;
  height?: number | string;
  marginRight?: number;
}

export function NewsCardSkeleton({ variant = 'card', width, height, marginRight = 0 }: NewsCardSkeletonProps) {
  if (variant === 'list') {
    const imgSize = (height as number) || 100;
    return (
      <View style={{ flexDirection: 'row', width: (width || '100%') as any, marginRight, gap: Spacing.lg, alignItems: 'center', paddingVertical: Spacing.xs }}>
        <Skeleton width={imgSize} height={imgSize} radius={Spacing.lg} />
        <View style={{ flex: 1, gap: Spacing.sm }}>
          <Skeleton width="90%" height={18} />
          <Skeleton width="55%" height={18} />
          <Skeleton width="35%" height={13} />
        </View>
      </View>
    );
  }

  if (variant === 'square') {
    const size = (width as number) || 180;
    return <Skeleton width={size} height={(height as number) || size} radius={Spacing.lg} style={{ marginRight }} />;
  }

  // "card" (implicit): dreptunghi mare cu raport 16:10, ca posterul de stire.
  const w = (width as number) || 320;
  const h = (height as number) || w / CARD_RATIO;
  return <Skeleton width={w} height={h} radius={Spacing.lg} style={{ marginRight }} />;
}

// ── Carousel (titlu + rand orizontal de carduri) ────────────────────────────────
interface CarouselSkeletonProps {
  variant?: 'card' | 'square';
  count?: number;
}

export function CarouselSkeleton({ variant = 'card', count = 4 }: CarouselSkeletonProps) {
  const cardWidth = variant === 'square' ? 180 : CAROUSEL_CARD_WIDTH;
  const cardHeight = variant === 'square' ? 180 : CAROUSEL_CARD_WIDTH / CARD_RATIO;

  return (
    <View style={{ marginVertical: Spacing.xl3 }}>
      {/* Titlul sectiunii */}
      <View style={{ paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm }}>
        <Skeleton width={160} height={28} />
      </View>
      {/* Randul de carduri (overflow ascuns => ultimul card e "taiat" ca la scroll) */}
      <View style={{ flexDirection: 'row', paddingHorizontal: Spacing.lg, overflow: 'hidden' }}>
        {Array.from({ length: count }).map((_, i) => (
          <NewsCardSkeleton
            key={i}
            variant={variant}
            width={cardWidth}
            height={cardHeight}
            marginRight={i === count - 1 ? 0 : CAROUSEL_CARD_MARGIN}
          />
        ))}
      </View>
    </View>
  );
}

// ── HomeHighlights (titlu + 3 carduri compacte stanga + card mare dreapta) ──────
export function HomeHighlightsSkeleton() {
  const { width } = useWindowDimensions();
  const stacked = width < 768;

  const compactList = (
    <View style={{ flex: 1, gap: Spacing.lg, justifyContent: 'space-between' }}>
      {Array.from({ length: 3 }).map((_, i) => (
        <NewsCardSkeleton key={i} variant="list" width="100%" />
      ))}
    </View>
  );

  const featured = <Skeleton width="100%" height={320} radius={Spacing.lg} />;

  return (
    <WebContainer style={{ marginVertical: Spacing.xl3 }}>
      <View style={{ paddingHorizontal: Spacing.lg }}>
        <Skeleton width={220} height={34} style={{ marginBottom: Spacing.sm }} />
        {stacked ? (
          <View style={{ gap: Spacing.lg }}>
            {compactList}
            {featured}
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: Spacing.xl, alignItems: 'stretch' }}>
            {compactList}
            <View style={{ flex: 1.2 }}>{featured}</View>
          </View>
        )}
      </View>
    </WebContainer>
  );
}

// ── Hero (banner full-bleed) ─────────────────────────────────────────────────────
export function HeroSkeleton() {
  return <Skeleton width="100%" height={HERO_HEIGHT} radius={0} />;
}

// ── Pagina Acasa completa (hero + highlights + carusele) ────────────────────────
export function HomeSkeleton() {
  return (
    <View>
      <HeroSkeleton />
      <HomeHighlightsSkeleton />
      <WebContainer style={{ paddingTop: Spacing.xl3 }}>
        <CarouselSkeleton variant="card" />
        <CarouselSkeleton variant="card" />
        <CarouselSkeleton variant="square" count={5} />
        <CarouselSkeleton variant="square" count={5} />
      </WebContainer>
    </View>
  );
}

// ── Lista de NewsCard (pagina Categorie) ────────────────────────────────────────
export function NewsListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <View style={{ gap: Spacing.xxl, paddingHorizontal: Spacing.lg }}>
      {Array.from({ length: count }).map((_, i) => (
        <NewsCardSkeleton key={i} variant="list" />
      ))}
    </View>
  );
}

// ── SesizareCard ─────────────────────────────────────────────────────────────────
export function SesizareCardSkeleton() {
  return (
    <View style={{ paddingVertical: Spacing.md }}>
      <View style={{ flexDirection: 'row', gap: Spacing.md }}>
        <Skeleton width={100} height={100} radius={10} />
        <View style={{ flex: 1, justifyContent: 'center', gap: Spacing.sm }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Skeleton width="40%" height={14} />
            <Skeleton width={70} height={14} />
          </View>
          <Skeleton width="85%" height={20} />
          <Skeleton width="30%" height={13} />
        </View>
      </View>
    </View>
  );
}

export function SesizariListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <View style={{ paddingHorizontal: Spacing.lg, gap: Spacing.md, marginTop: Spacing.xs }}>
      {Array.from({ length: count }).map((_, i) => (
        <SesizareCardSkeleton key={i} />
      ))}
    </View>
  );
}

// ── Meniul cantinei (cutie cu chenar + cateva randuri de categorii) ─────────────
export function CantinaMenuSkeleton({ rows = 5 }: { rows?: number }) {
  const theme = useSkeletonTheme();
  return (
    <View
      style={{
        overflow: 'hidden',
        marginHorizontal: Spacing.lg,
      }}
    >
      {Array.from({ length: rows }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.cantinaRow,
            i > 0 ? { borderTopWidth: 1, borderTopColor: theme.border } : null,
          ]}
        >
          <Skeleton width={i === 0 ? 160 : 120 + (i % 3) * 30} height={20} />
          <Skeleton width={20} height={20} radius={10} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  cantinaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
});

// ── Harta ────────────────────────────────────────────────────────────────────────
export function MapSkeleton() {
  return <Skeleton width="100%" height="100%" radius={16} />;
}

// ── Vizualizare (pagina de detalii) ─────────────────────────────────────────────
export function VizualizareSkeleton() {
  return (
    <View style={{ flex: 1 }}>
      {/* Imaginea de sus */}
      <Skeleton width="100%" height={320} radius={0} />
      {/* Continut */}
      <View style={{ padding: Spacing.lg, gap: Spacing.lg }}>
        {/* Categorie / Data */}
        <Skeleton width="30%" height={16} />
        {/* Titlu */}
        <Skeleton width="90%" height={28} />
        <Skeleton width="60%" height={28} style={{ marginBottom: Spacing.md }} />
        {/* Corp text */}
        <Skeleton width="100%" height={16} style={{ marginBottom: Spacing.xs }} />
        <Skeleton width="95%" height={16} style={{ marginBottom: Spacing.xs }} />
        <Skeleton width="98%" height={16} style={{ marginBottom: Spacing.xs }} />
        <Skeleton width="90%" height={16} style={{ marginBottom: Spacing.lg }} />
        
        <Skeleton width="100%" height={16} style={{ marginBottom: Spacing.xs }} />
        <Skeleton width="92%" height={16} style={{ marginBottom: Spacing.xs }} />
        <Skeleton width="96%" height={16} style={{ marginBottom: Spacing.xs }} />
        <Skeleton width="50%" height={16} />
      </View>
    </View>
  );
}
