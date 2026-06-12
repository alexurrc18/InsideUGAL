// Sectiunea "Recomandate" de pe pagina Acasa (web), intre hero si carusele.
// Folosita doar din acasa/index.web.tsx => nu intra in bundle-ul de mobil.
//
// Layout: doua coloane.
//   - stanga: 3 carduri compacte (poza mica + titlu/data), stil Sesizari, dar mai mic;
//   - dreapta: un card mare "featured" (imagine full + gradient + titlu).
// Pe ecrane inguste (<768px) coloanele se stivuiesc vertical.
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { ColorScheme, Colors, Spacing } from "@/constants/theme";
import { Typography } from "@/constants/typography";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { WebContainer } from "@/components/ui/web-container";
import { getFormattedDate } from "@/utils/date";

export interface HighlightItem {
  id: string;
  title: string;
  category?: string;
  date?: string;
  date_start?: string;
  author?: string;
  image?: string;
}

interface HomeHighlightsProps {
  featured?: HighlightItem;
  items: HighlightItem[];
  onPressItem: (item: HighlightItem) => void;
  title?: string;
}

const FALLBACK_IMAGE = require("@/assets/images/campus-stiintei.png");

function itemDate(item: HighlightItem) {
  return getFormattedDate(item.date_start || item.date);
}

/** Card orizontal compact: poza stanga, text dreapta. Latime flexibila (umple containerul). */
export function CompactCard({ item, onPress }: { item: HighlightItem; onPress: () => void }) {
  const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
  const theme = Colors[themeName];

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.compact, { opacity: pressed ? 0.85 : 1 }]}>
      <Image
        source={item.image ? { uri: item.image } : FALLBACK_IMAGE}
        style={styles.compactImage}
        contentFit="cover"
      />
      <View style={styles.compactBody}>
        {item.category ? (
          <View style={styles.compactChip}>
            <Text style={[Typography.Small1, { color: ColorScheme.white }]} numberOfLines={1}>
              {item.category}
            </Text>
          </View>
        ) : null}
        <Text style={[Typography.Heading6, { color: theme.text }]} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={[Typography.Small2, { color: theme.textSecondary }]} numberOfLines={1}>
          {[itemDate(item), item.author].filter(Boolean).join("  ·  ")}
        </Text>
      </View>
    </Pressable>
  );
}

/** Card mare "featured": imagine full-bleed + gradient + text jos. */
function FeaturedCard({ item, onPress }: { item: HighlightItem; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.featured, { opacity: pressed ? 0.92 : 1 }]}>
      <Image
        source={item.image ? { uri: item.image } : FALLBACK_IMAGE}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
      />
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.4)", "rgba(0,0,0,0.85)"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.featuredBody}>
        {item.category ? (
          <View style={styles.chip}>
            <Text style={[Typography.Small1, { color: ColorScheme.white }]}>{item.category}</Text>
          </View>
        ) : null}
        <Text style={[Typography.Heading2, { color: ColorScheme.white, marginTop: Spacing.sm }]} numberOfLines={3}>
          {item.title}
        </Text>
        <Text style={[Typography.Paragraph3, { color: ColorScheme.white, opacity: 0.9, marginTop: Spacing.xs }]}>
          {[itemDate(item), item.author].filter(Boolean).join("  ·  ")}
        </Text>
      </View>
    </Pressable>
  );
}

export function HomeHighlights({ featured, items, onPressItem, title = "Recomandate" }: HomeHighlightsProps) {
  const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
  const theme = Colors[themeName];
  const { width } = useWindowDimensions();
  const stacked = width < 768;

  if (!featured && items.length === 0) return null;

  return (
    <WebContainer style={{ marginVertical: Spacing.lg }}>
      <View style={{ paddingHorizontal: Spacing.lg }}>
        {title ? (
          <Text style={[Typography.Heading3, { color: theme.text, marginBottom: Spacing.lg }]}>{title}</Text>
        ) : null}

        {stacked ? (
          // Ecran ingust: TOATE cardurile (cele 3 compacte + cel mare) intr-o singura
          // coloana cu un singur `gap`. Asa au exact aceeasi distanta intre ele —
          // acelasi mecanism prin care cele 3 compacte erau deja spatiate corect.
          <View style={styles.stack}>
            {items.map((item) => (
              <CompactCard key={item.id} item={item} onPress={() => onPressItem(item)} />
            ))}
            {featured ? <FeaturedCard item={featured} onPress={() => onPressItem(featured)} /> : null}
          </View>
        ) : (
          // Ecran lat: doua coloane (3 carduri compacte stanga + card mare dreapta).
          <View style={styles.row}>
            <View style={styles.listCol}>
              {items.map((item) => (
                <CompactCard key={item.id} item={item} onPress={() => onPressItem(item)} />
              ))}
            </View>
            {featured ? (
              <View style={styles.featuredCol}>
                <FeaturedCard item={featured} onPress={() => onPressItem(featured)} />
              </View>
            ) : null}
          </View>
        )}
      </View>
    </WebContainer>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: Spacing.xl,
    alignItems: "stretch",
  },
  // Ecran ingust: o singura coloana, toate cardurile la aceeasi distanta (gap).
  stack: {
    gap: Spacing.lg,
  },
  listCol: {
    flex: 1,
    gap: Spacing.lg,
    justifyContent: "space-between",
  },
  featuredCol: {
    flex: 1.2,
  },
  compact: {
    flexDirection: "row",
    gap: Spacing.md,
    alignItems: "center",
  },
  compactImage: {
    width: 88,
    height: 88,
    borderRadius: Spacing.md,
  },
  compactBody: {
    flex: 1,
    justifyContent: "center",
    gap: Spacing.xxs,
  },
  featured: {
    minHeight: 320,
    flex: 1,
    borderRadius: Spacing.lg,
    overflow: "hidden",
  },
  featuredBody: {
    flex: 1,
    padding: Spacing.xl,
    justifyContent: "flex-end",
  },
  chip: {
    alignSelf: "flex-start",
    backgroundColor: ColorScheme.red,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: 999,
  },
  compactChip: {
    alignSelf: "flex-start",
    backgroundColor: ColorScheme.blue,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: 999,
    marginBottom: Spacing.xxs,
  },
});
