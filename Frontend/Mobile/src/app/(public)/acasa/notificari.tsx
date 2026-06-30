import { useColorScheme } from "@/hooks/use-color-scheme";
import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, Linking } from "react-native";
import { Stack, useRouter } from "expo-router";
import { storage } from "@/services/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Spacing } from "@/constants/theme";
import { Typography } from "@/constants/typography";
import { NotificareCard, Notificare } from "@/components/ui/display/notificare-card";
import BackIcon from "@/assets/icons/svg/chevron-left.svg";
import TaskIcon from "@/assets/icons/svg/task.svg";

export const MOCK_NOTIFICARI: Notificare[] = [
  {
    id: "1",
    data: "27 iunie 2026",
    titlu: "Rezultate sesiune de vară",
    continut: "Rezultatele pentru sesiunea de examene de vară au fost publicate în Registrul Matricol. Vă rugăm să verificați situația academică.",
    actiune: "/(public)/acasa/vizualizare?id=1",
  },
  {
    id: "2",
    data: "25 iunie 2026",
    titlu: "Eveniment: Ziua Porților Deschise",
    continut: "Universitatea Dunărea de Jos organizează Ziua Porților Deschise pe 30 iunie 2026, începând cu ora 10:00, în Campusul Științei.",
    actiune: "/(public)/acasa/vizualizare?id=2",
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
    actiune: "/(public)/acasa/vizualizare?id=4",
  },
  {
    id: "5",
    data: "12 iunie 2026",
    titlu: "Înscrieri la cazare",
    continut: "Perioada de înscriere pentru cazarea în căminele studențești a început. Depuneți cererea online până pe 30 iunie 2026.",
    actiune: "/(public)/acasa/vizualizare?id=5",
  },
  {
    id: "6",
    data: "8 iunie 2026",
    titlu: "Concurs de proiecte studențești",
    continut: "Te invităm să participi la concursul anual de proiecte studențești. Premii și mentorat pentru cele mai bune idei.",
    actiune: "/(public)/acasa/vizualizare?id=6",
  },
  {
    id: "7",
    data: "3 iunie 2026",
    titlu: "Program bibliotecă în sesiune",
    continut: "Pe perioada sesiunii, biblioteca universitară are program prelungit, de luni până sâmbătă, între orele 8:00 și 22:00.",
    actiune: "/(public)/acasa/vizualizare?id=7",
  },
];

export default function NotificariScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
  const theme = Colors[themeName];
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

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
  }, []);

  const markAllRead = () => {
    const allIds = new Set(MOCK_NOTIFICARI.map((n) => n.id));
    setReadIds(allIds);
    storage.setItem('read_notification_ids', JSON.stringify(Array.from(allIds)));
  };

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
          headerRight: () => (
            <Pressable onPress={markAllRead} style={{ padding: Spacing.xs }} hitSlop={6}>
              {({ pressed }) => (
                <TaskIcon 
                  width={24} 
                  height={24} 
                  color={pressed ? theme.primary : theme.text} 
                />
              )}
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
          <NotificareCard 
            key={item.id} 
            item={item} 
            theme={theme} 
            isUnread={!readIds.has(item.id)}
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
              }
            }}
          />
        ))}
      </ScrollView>
    </View>
  );
}