import { useColorScheme } from "@/hooks/use-color-scheme";
import { View, Text, ScrollView, Pressable } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Spacing } from "@/constants/theme";
import { Typography } from "@/constants/typography";
import BackIcon from "@/assets/icons/svg/chevron-left.svg";

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
];

function NotificareCard({ item, theme }: { item: Notificare; theme: typeof Colors.light | typeof Colors.dark }) {
  return (
    <View style={{
      paddingVertical: Spacing.lg,
      gap: Spacing.xs,
    }}>
      <Text style={[Typography.Small1, { color: theme.text }]}>
        {item.data}
      </Text>
      <Text style={[Typography.Heading4, { color: theme.text }]}>
        {item.titlu}
      </Text>
      <Text style={[Typography.Paragraph2, { color: theme.text, lineHeight: 22 }]}>
        {item.continut}
      </Text>
    </View>
  );
}

export default function NotificariScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
  const theme = Colors[themeName];

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: theme.background },
          headerShadowVisible: false,
          headerTitle: "Notificări",
          headerTitleStyle: { ...Typography.Heading4, color: theme.text },
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={{ padding: Spacing.xs }}>
              <BackIcon width={28} height={28} color={theme.text} />
            </Pressable>
          ),
        }}
      />

      <ScrollView
        contentContainerStyle={{
          padding: Spacing.lg,
          paddingBottom: insets.bottom + Spacing.xl,
          gap: Spacing.md,
        }}
      >
        {MOCK_NOTIFICARI.map((item) => (
          <NotificareCard key={item.id} item={item} theme={theme} />
        ))}
      </ScrollView>
    </View>
  );
}