import React, { useState, useCallback } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Colors, Spacing } from "@/constants/theme";
import { Typography } from "@/constants/typography";
import { WebContainer } from "@/components/ui/layout/web-container";
import { CategoryHeader, FilterItem } from "@/components/ui/display/category-header";
import { useWebContentTop } from "@/hooks/use-web-content-top";
import { SesizareCard, Sesizare } from "@/components/ui/display/sesizare-card";
import MockData from "@/constants/mock-data.json";
import PlusIcon from "@/assets/icons/svg/plus.svg";

type FilterType = "mele" | "active" | "respinse" | "finalizate";

const filters: FilterItem[] = [
  { id: "mele", title: "Sesizările mele" },
  { id: "active", title: "Active" },
  { id: "respinse", title: "Respinse" },
  { id: "finalizate", title: "Finalizate" },
];

export default function SesizariScreen() {
  const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
  const theme = Colors[themeName];
  const insets = useSafeAreaInsets();
  const contentTop = useWebContentTop();
  const router = useRouter();

  const [reports, setReports] = useState<Sesizare[]>(MockData.reports as Sesizare[]);
  const [activeFilter, setActiveFilter] = useState<FilterType>("mele");

  // Reimprospatam lista la fiecare revenire pe ecran (ex: dupa ce s-a adaugat o
  // sesizare noua si s-a dat back), la fel ca pe mobil.
  useFocusEffect(
    useCallback(() => {
      setReports([...(MockData.reports as Sesizare[])]);
    }, [])
  );

  const filteredData = reports.filter((item) => {
    if (activeFilter === "mele") return item.isUserReport;
    if (activeFilter === "active") return item.status === "active";
    if (activeFilter === "respinse") return item.status === "respinse";
    if (activeFilter === "finalizate") return item.status === "finalizate";
    return true;
  });

  const handleCardPress = (item: Sesizare) => {
    router.push({
      pathname: "/(public)/sesizari/detalii",
      params: {
        id: item.id,
        title: item.title,
        description: item.description,
        category: item.category,
        location: item.location,
        status: item.status,
        date: item.date,
        image: item.image,
      },
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: contentTop,
          paddingBottom: insets.bottom + Spacing.xxl,
        }}
      >
        <WebContainer>
          <CategoryHeader
            title="Sesizări"
            filters={filters}
            selectedFilterId={activeFilter}
            onSelectFilter={(id) => setActiveFilter((id as FilterType) || "mele")}
            autoAbbreviate={false}
            rightElement={
              <Pressable
                onPress={() => router.push("/(public)/sesizari/adauga")}
                style={({ pressed }) => [
                  {
                    padding: Spacing.xs,
                    borderRadius: 20,
                    justifyContent: "center",
                    alignItems: "center",
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <PlusIcon width={32} height={32} color={theme.text} />
              </Pressable>
            }
          />

          <View style={{ paddingHorizontal: Spacing.lg, gap: Spacing.md, marginTop: Spacing.xs }}>
            {filteredData.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => handleCardPress(item)}
                style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
              >
                <SesizareCard item={item} />
              </Pressable>
            ))}

            {filteredData.length === 0 && (
              <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 64 }}>
                <Text style={[Typography.Heading5, { color: theme.text, marginBottom: Spacing.xs }]}>
                  Nicio sesizare în această secțiune
                </Text>
                <Text style={[Typography.Paragraph3, { color: theme.textSecondary, textAlign: "center" }]}>
                  Momentan nu există înregistrări.
                </Text>
              </View>
            )}
          </View>
        </WebContainer>
      </ScrollView>
    </View>
  );
}
