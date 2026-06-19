import React, { useState } from "react";
import { View, Text, Pressable, Animated } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { Colors, Spacing } from "@/constants/theme";
import { Typography } from "@/constants/typography";
import { WebContainer } from "@/components/ui/layout/web-container";
import { NewsCard } from "@/components/ui/display/news-card";
import { CategoryHeader, FilterItem } from "@/components/ui/display/category-header";
import { Breadcrumbs, type Crumb } from "@/components/ui/navigation/breadcrumbs";
import { useWebContentTop } from "@/hooks/use-web-content-top";
import { useMockLoading } from "@/hooks/use-mock-loading";
import { NewsListSkeleton } from "@/components/ui/display/skeletons";
import { Seo } from "@/components/seo";
import { eventHref } from "@/utils/article-url";
import { getFormattedDate } from "@/utils/date";
import BackIcon from "@/assets/icons/svg/chevron-left.svg";
import MOCK_DATA from "@/constants/mock-data.json";

export default function CategoryScreen() {
  const { title: categoryTitle } = useLocalSearchParams();
  const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
  const theme = Colors[themeName];
  const insets = useSafeAreaInsets();
  const contentTop = useWebContentTop();
  const router = useRouter();

  const [scrollY] = useState(() => new Animated.Value(0));

  const [selectedFacultyId, setSelectedFacultyId] = useState<string | null>(null);

  const loading = useMockLoading();

  const crumbs: Crumb[] = [
    { label: "Acasă", href: "/(public)/acasa" },
    { label: (categoryTitle as string) || "Categorie" }
  ];

  // Pregătim filtrele pentru facultăți (folosim noua interfață FilterItem)
  const facultyFilters: FilterItem[] = [
    { id: null, title: "Toate Facultățile", abbreviation: "Toate Facultățile" },
    ...MOCK_DATA.faculties.map(f => ({
        id: f.id,
        title: f.title
    }))
  ];

  // Filtram datele din JSON pe baza categoriei primite ca parametru și a facultății selectate
  const filteredData = categoryTitle === "Facultăți"
    ? MOCK_DATA.faculties
    : MOCK_DATA.events.filter(e =>
        (e as any).category === categoryTitle &&
        (!selectedFacultyId || (e as any).facultyId === selectedFacultyId || !(e as any).facultyId)
      );

  const handlePress = (item: any) => {
    // Evenimentele au URL curat (/eveniment/<id>-<slug>); restul raman pe vizualizare.
    if ((item as any).category === "Evenimente") {
        router.push(eventHref(item) as any);
        return;
    }
    let type = categoryTitle === "Evenimente" ? "Eveniment" : "Anunț";
    if (categoryTitle === "Facultăți") type = "Facultate";

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
            date: item.date_start || item.date
        }
    });
  };

  const headerTitleOpacity = scrollY.interpolate({
    inputRange: [80, 120],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Seo
        title={(categoryTitle as string) || "Categorie"}
        description={`${(categoryTitle as string) || "Anunțuri"} — InsideUGAL, platforma studenților Universității „Dunărea de Jos” din Galați.`}
      />
      <Stack.Screen
        options={{
          // Pe web ascundem header-ul de Stack: WebNavbar-ul (overlay) il acopera
          // oricum, deci era spatiu mort care impingea continutul prea jos.
          headerShown: false,
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
          paddingBottom: insets.bottom + Spacing.xxl
        }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        <WebContainer>
          <View style={{ paddingTop: contentTop, paddingHorizontal: Spacing.lg, marginTop: Spacing.md }}>
              <Breadcrumbs items={crumbs} />
          </View>

          <View style={{ marginBottom: Spacing.lg, marginTop: Spacing.lg }}>
              <CategoryHeader
                  title={(categoryTitle as string) || "Categorie"}
                  filters={categoryTitle === "Facultăți" ? undefined : facultyFilters}
                  selectedFilterId={selectedFacultyId}
                  onSelectFilter={setSelectedFacultyId}
              />
          </View>

          {loading ? (
            <NewsListSkeleton />
          ) : (
            <>
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
            </>
          )}
        </WebContainer>
      </Animated.ScrollView>
    </View>
  );
}
