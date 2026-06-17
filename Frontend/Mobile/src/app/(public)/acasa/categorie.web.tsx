import React, { useState, useEffect } from "react";
import { View, Text, Pressable, Animated, ActivityIndicator } from "react-native";
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
import { getFormattedDate, isoToRomanianDateStr } from "@/utils/date";
import BackIcon from "@/assets/icons/svg/chevron-left.svg";
import api from "@/services/api";

export default function CategoryScreen() {
  const { title: categoryTitle } = useLocalSearchParams();
  const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
  const theme = Colors[themeName];
  const insets = useSafeAreaInsets();
  const contentTop = useWebContentTop();
  const router = useRouter();

  const [scrollY] = useState(() => new Animated.Value(0));

  const [selectedFacultyId, setSelectedFacultyId] = useState<string | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [faculties, setFaculties] = useState<any[]>([]);

  const crumbs: Crumb[] = [
    { label: "Acasă", href: "/(public)/acasa" },
    { label: (categoryTitle as string) || "Categorie" }
  ];

  // Fetch faculties list for filter options
  useEffect(() => {
    const fetchFaculties = async () => {
      try {
        const response = await api.get("/faculties/", {
          params: { page: 1, size: 50 }
        });
        if (response.data && response.data.items) {
          setFaculties(response.data.items);
        }
      } catch (err) {
        console.error("[API] Error fetching faculties for filter:", err);
      }
    };
    fetchFaculties();
  }, []);

  const facultyFilters: FilterItem[] = [
    { id: null, title: "Toate Facultățile", abbreviation: "Toate" },
    ...faculties.map(f => ({
      id: f.id.toString(),
      title: f.name
    }))
  ];

  const fetchData = async (pageToFetch: number, isReset: boolean = false) => {
    if (loading || (!hasMore && !isReset)) return;
    setLoading(true);
    try {
      let response;
      let newItems: any[] = [];
      
      if (categoryTitle === "Noutăți" || categoryTitle === "Evenimente") {
        const type = categoryTitle === "Noutăți" ? "NOUTATE" : "EVENIMENT";
        response = await api.get("/announcements/", {
          params: {
            page: pageToFetch,
            size: 20,
            announcement_type: type,
            faculty_id: selectedFacultyId || undefined
          }
        });
        
        if (response.data && response.data.items) {
          newItems = response.data.items.map((item: any) => ({
            id: item.id.toString(),
            title: item.title,
            category: categoryTitle,
            date: isoToRomanianDateStr(item.start_date || item.created_at) || "--",
            date_start: isoToRomanianDateStr(item.start_date) || "--",
            date_end: isoToRomanianDateStr(item.end_date) || "--",
            time_start: item.start_date ? new Date(item.start_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
            time_end: item.end_date ? new Date(item.end_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
            author: item.location_name || "",
            image: item.image_url || undefined,
            content: item.content,
            location: item.location_name || "",
          }));
        }
      } else if (categoryTitle === "Facultăți") {
        response = await api.get("/faculties/", {
          params: {
            page: pageToFetch,
            size: 20
          }
        });
        if (response.data && response.data.items) {
          newItems = response.data.items.map((item: any) => ({
            id: item.id.toString(),
            title: item.name,
            image: item.image_url || undefined,
            address: item.address || "",
            phone: item.phone || "",
            website: item.website_url || "",
            content: item.description || "",
          }));
        }
      } else if (categoryTitle === "Facilități") {
        response = await api.get("/locations/", {
          params: {
            page: pageToFetch,
            size: 20
          }
        });
        if (response.data && response.data.items) {
          newItems = response.data.items.map((item: any) => ({
            id: item.id.toString(),
            title: item.name,
            image: item.image_url || undefined,
            address: item.address || "",
            phone: item.phone || "",
            website: item.website_url || "",
            content: item.name,
            schedule: item.schedule || "",
          }));
        }
      }
      
      if (newItems.length < 20) {
        setHasMore(false);
      }
      
      setData(prev => isReset ? newItems : [...prev, ...newItems]);
      setPage(pageToFetch);
    } catch (err) {
      console.error("[API] Error fetching data:", err);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setData([]);
    setPage(1);
    setHasMore(true);
    fetchData(1, true);
  }, [selectedFacultyId, categoryTitle]);

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

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 150;
    if (isCloseToBottom && hasMore && !loading) {
      fetchData(page + 1);
    }
  };

  const headerTitleOpacity = scrollY.interpolate({
    inputRange: [80, 120],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen
        options={{
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
          { 
            useNativeDriver: true,
            listener: handleScroll
          }
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
                  filters={categoryTitle === "Facultăți" || categoryTitle === "Facilități" ? undefined : facultyFilters}
                  selectedFilterId={selectedFacultyId}
                  onSelectFilter={setSelectedFacultyId}
              />
          </View>

          <View style={{ gap: Spacing.xxl, paddingHorizontal: Spacing.lg }}>
            {data.map((item) => (
                <NewsCard
                    key={item.id}
                    variant="list"
                    title={item.title}
                    author={item.author || item.address}
                    date={getFormattedDate(item.date_start || item.date)}
                    image={item.image}
                    onPress={() => handlePress(item)}
                />
            ))}
          </View>

          {loading && (
            <View style={{ paddingVertical: Spacing.lg, justifyContent: "center", alignItems: "center" }}>
              <ActivityIndicator size="small" color={theme.primary} />
            </View>
          )}

          {data.length === 0 && !loading && (
              <Text style={[Typography.Paragraph1, { color: theme.text, textAlign: "center", marginTop: 40 }]}>
                  Nu există elemente în această categorie.
              </Text>
          )}
        </WebContainer>
      </Animated.ScrollView>
    </View>
  );
}
