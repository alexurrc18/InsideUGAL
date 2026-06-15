import React, { useState } from "react";
import { View, Text, useColorScheme, Pressable, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { Colors, Spacing } from "@/constants/theme";
import { Typography } from "@/constants/typography";
import { NewsCard } from "@/components/ui/news-card";
import { CategoryHeader, FilterItem } from "@/components/ui/category-header";
import { getFormattedDate } from "@/utils/date";
import BackIcon from "@/assets/icons/svg/chevron-left.svg";
import MOCK_DATA from "@/constants/mock-data.json";

export default function CategoryScreen() {
  const { title: categoryTitle } = useLocalSearchParams();
  const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
  const theme = Colors[themeName];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [scrollY] = useState(() => new Animated.Value(0));

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

  const headerTitleOpacity = scrollY.interpolate({
    inputRange: [50, 90],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerShadowVisible: false,
          headerTransparent: false,
          headerStyle: {
            backgroundColor: theme.background,
          },
          headerTintColor: theme.text,
          headerLeft: () => (
            <Pressable 
              onPress={() => router.back()} 
              style={({ pressed }) => ({
                padding: Spacing.xs,
                marginLeft: -Spacing.xs,
                opacity: pressed ? 0.6 : 1
              })}
            >
              <BackIcon width={28} height={28} color={theme.text} />
            </Pressable>
          ),
          headerTitle: () => (
            <Animated.View style={{ opacity: headerTitleOpacity }}>
              <Text 
                style={[
                  Typography.Heading4, 
                  { 
                    color: theme.text,
                    textAlign: "center"
                  }
                ]}
                numberOfLines={1}
              >
                {(categoryTitle as string) || "Categorie"}
              </Text>
            </Animated.View>
          ),
        }}
      />

      <Animated.ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ 
          paddingTop: Spacing.md,
          paddingBottom: insets.bottom + Spacing.xxl
        }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        <View style={{ marginBottom: Spacing.lg }}>
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
                  author={(item as any).author || (item as any).address}
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

      </Animated.ScrollView>
    </View>
  );
}
