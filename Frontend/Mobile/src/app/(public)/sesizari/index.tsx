import React, { useState, useEffect } from "react";
import { View, Text, Pressable, useColorScheme, FlatList } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useNavigation, useLocalSearchParams } from "expo-router";
import { Colors, Spacing } from "@/constants/theme";
import { Typography } from "@/constants/typography";
import { SesizareCard, Sesizare } from "@/components/ui/display/sesizare-card";
import MockData from "@/constants/mock-data.json";

type FilterType = "mele" | "active" | "respinse" | "finalizate";

export default function SesizariScreen() {
  const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
  const theme = Colors[themeName];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams();

  const [reports, setReports] = useState<Sesizare[]>(MockData.reports as Sesizare[]);
  const activeFilter = (params.filter as FilterType) || "mele";

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      setReports([...(MockData.reports as Sesizare[])]);
    });
    return unsubscribe;
  }, [navigation]);

  const filteredData = reports.filter(item => {
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

  const renderItem = ({ item }: { item: Sesizare }) => (
    <Pressable 
      onPress={() => handleCardPress(item)} 
      style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
    >
      <SesizareCard item={item} />
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <FlatList
        data={filteredData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: Spacing.lg,
          paddingTop: Spacing.xs,
          paddingBottom: insets.bottom + Spacing.xl,
          gap: Spacing.md
        }}
        ListEmptyComponent={
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 64 }}>
            <Text style={[Typography.Heading5, { color: theme.text, marginBottom: Spacing.xs }]}>
              Nicio sesizare în această secțiune
            </Text>
            <Text style={[Typography.Paragraph3, { color: theme.textSecondary, textAlign: "center" }]}>
              Momentan nu există înregistrări.
            </Text>
          </View>
        }
      />
    </View>
  );
}