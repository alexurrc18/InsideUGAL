// Breadcrumbs pentru paginile de continut web (folosit doar din fisiere .web.tsx,
// deci nu intra in bundle-ul de mobil). Afiseaza un sir de tip
// "Acasă / Noutăți / Titlul articolului", cu segmentele intermediare clickabile.
import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Colors, Spacing } from "@/constants/theme";
import { Typography } from "@/constants/typography";
import { useColorScheme } from "@/hooks/use-color-scheme";

export interface Crumb {
  label: string;
  /** Daca e setat, segmentul e clickabil si navigheaza acolo. Ultimul (pagina
   *  curenta) se lasa fara href. */
  href?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
  const theme = Colors[themeName];
  const router = useRouter();

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center" }}>
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        const linkable = !!item.href && !isLast;
        return (
          <View key={`${item.label}-${i}`} style={{ flexDirection: "row", alignItems: "center" }}>
            {linkable ? (
              <Pressable
                onPress={() => router.push(item.href as any)}
                accessibilityRole="link"
                style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
              >
                <Text style={[Typography.Small1, { color: theme.primary }]}>{item.label}</Text>
              </Pressable>
            ) : (
              <Text style={[Typography.Small1, { color: theme.textSecondary }]} numberOfLines={1}>
                {item.label}
              </Text>
            )}

            {!isLast && (
              <Text style={[Typography.Small1, { color: theme.textSecondary, marginHorizontal: Spacing.xs }]}>
                /
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}
