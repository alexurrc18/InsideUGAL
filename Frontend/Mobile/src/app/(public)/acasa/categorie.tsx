import React from "react";
import { View, Text, ScrollView, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Colors } from "@/constants/theme";
import { Typography } from "@/constants/typography";
import { NewsCard } from "@/components/ui/news-card";
import MOCK_DATA from "@/constants/mock-data.json";

export default function CategoryScreen() {
  const { title: categoryTitle } = useLocalSearchParams();
  const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
  const theme = Colors[themeName];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Filtram datele din JSON pe baza categoriei primite ca parametru
  const filteredData = MOCK_DATA.events.filter(e => e.category === categoryTitle);

  const handlePress = (item: any) => {
    const type = categoryTitle === "Evenimente" ? "Eveniment" : "Anunț";
    
    router.push({
        pathname: "/(public)/acasa/vizualizare",
        params: {
            type,
            title: item.title,
            category: categoryTitle,
            content: item.content,
            image: item.image,
            location: item.location,
            date_start: item.date_start,
            date_end: item.date_end,
            time_start: item.time_start,
            time_end: item.time_end
        }
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ 
          padding: 16, 
          paddingTop: insets.top + 50,
          gap: 20 
        }}
      >
        <Text style={[Typography.Heading1, { color: theme.text, marginBottom: 8 }]}>
          {categoryTitle || "Categorie"}
        </Text>

        {filteredData.map((item) => (
            <NewsCard 
                key={item.id}
                variant="list"
                title={item.title}
                author={item.author}
                date={item.date_start || item.date}
                image={item.image}
                onPress={() => handlePress(item)}
            />
        ))}

        {filteredData.length === 0 && (
            <Text style={[Typography.Paragraph1, { color: theme.text, textAlign: "center", marginTop: 40 }]}>
                Nu există elemente în această categorie.
            </Text>
        )}

      </ScrollView>
    </View>
  );
}
