import React, { useState } from "react";
import { View, Text, ScrollView, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Colors, Spacing } from "@/constants/theme";
import { Typography } from "@/constants/typography";
import { NewsCard } from "@/components/ui/news-card";
import { CategoryHeader, FilterItem } from "@/components/ui/category-header";
import { getFormattedDate } from "@/utils/date";
import MOCK_DATA from "@/constants/mock-data.json";

export default function CategoryScreen() {
  const { title: categoryTitle } = useLocalSearchParams();
  const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
  const theme = Colors[themeName];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [selectedFacultyId, setSelectedFacultyId] = useState<string | null>(null);

  const facultyFilters: FilterItem[] = [
    { id: null, title: "Toate Facultățile", abbreviation: "Toate Facultățile" },
    ...MOCK_DATA.faculties.map(f => ({
        id: f.id,
        title: f.title
    }))
  ];

  const filteredData = categoryTitle === "Facultăți" 
    ? MOCK_DATA.faculties 
    : categoryTitle === "Facilități"
    ? MOCK_DATA.facilities
    : MOCK_DATA.events.filter(e => 
        (e as any).category === categoryTitle && 
        (!selectedFacultyId || (e as any).facultyId === selectedFacultyId || !(e as any).facultyId)
      );

  const handlePress = (item: any) => {
    let type = categoryTitle === "Evenimente" ? "Eveniment" : "Anunț";
    if (categoryTitle === "Facultăți") type = "Facultate";
    if (categoryTitle === "Facilități") type = "Facilitate";
    
    router.push({
        pathname: "/(public)/acasa/vizualizare",
        params: {
            type,
            title: item.title,
            category: categoryTitle as string,
            content: item.content,
            image: item.image,
            location: item.location,
            date_start: item.date_start,
            date_end: item.date_end,
            time_start: item.time_start,
            time_end: item.time_end,
            address: item.address,
            phone: item.phone,
            website: item.website,
            schedule: item.schedule,
            date: item.date_start || item.date
        }
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ 
          paddingBottom: insets.bottom + Spacing.xxl
        }}
      >
        <View style={{ paddingTop: insets.top + 50, marginBottom: Spacing.lg }}>
            <CategoryHeader 
                title={(categoryTitle as string) || "Categorie"}
                filters={categoryTitle === "Facultăți" || categoryTitle === "Facilități" ? undefined : facultyFilters}
                selectedFilterId={selectedFacultyId}
                onSelectFilter={setSelectedFacultyId}
            />
        </View>

        <View style={{ gap: Spacing.xxl, paddingHorizontal: Spacing.lg }}>
          {filteredData.map((item) => (
              <NewsCard 
                  key={item.id}
                  variant="list"
                  title={item.title}
                  author={(item as any).author}
                  date={getFormattedDate((item as any).date_start || (item as any).date)}
                  image={item.image}
                  onPress={() => handlePress(item)}
              />
          ))}
        </View>

        {filteredData.length === 0 && (
            <Text style={[Typography.Paragraph1, { color: theme.text, textAlign: "center", marginTop: 40 }]}>
                Nu există elemente în această categorie.
            </Text>
        )}

      </ScrollView>
    </View>
  );
}
