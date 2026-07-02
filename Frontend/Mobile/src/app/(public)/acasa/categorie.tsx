import { useColorScheme } from "@/hooks/use-color-scheme";
import React, { useState, useEffect } from "react";
import { View, Text, Pressable, RefreshControl, Alert } from "react-native";
import Animated, { useSharedValue, useAnimatedScrollHandler, useAnimatedStyle, interpolate, Extrapolation, runOnJS } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { Colors, Spacing } from "@/constants/theme";
import { Typography } from "@/constants/typography";
import { NewsCard } from "@/components/ui/display/news-card";
import { CategoryHeader, FilterItem } from "@/components/ui/display/category-header";
import { getFormattedDate, isoToRomanianDateStr } from "@/utils/date";
import BackIcon from "@/assets/icons/svg/chevron-left.svg";
import api from "@/services/api";
import { useTranslation } from 'react-i18next';
import { NewsListSkeleton } from "@/components/ui/display/skeletons";
import { ErrorState } from "@/components/ui/display/error-state";

export default function CategoryScreen() {
  const { title: categoryTitle } = useLocalSearchParams();
  const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
  const theme = Colors[themeName];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const scrollY = useSharedValue(0);
  const headerTitleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [50, 90], [0, 1], Extrapolation.CLAMP),
  }));

  const { t, i18n } = useTranslation();
  const displayTitle = categoryTitle === "Noutăți" ? t('home.news')
    : categoryTitle === "Evenimente" ? t('home.events')
    : categoryTitle === "Facultăți" ? t('home.faculties')
    : categoryTitle === "Facilități" ? t('home.facilities')
    : (categoryTitle as string) || t('category.fallback');

  const [selectedFacultyId, setSelectedFacultyId] = useState<string | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [faculties, setFaculties] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [hasError, setHasError] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    setHasMore(true);
    setHasError(false);
    const success = await fetchData(1, true);
    if (!success && data.length > 0) {
      Alert.alert(t('common.updateError'), t('category.refreshError'));
    }
    setPage(1);
    setRefreshing(false);
  };

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
    { id: null, title: t('category.allFaculties'), abbreviation: t('category.all') },
    ...faculties.map(f => ({
      id: f.id.toString(),
      title: f.name,
      abbreviation: f.abbreviation || undefined,
    }))
  ];

  const fetchData = async (pageToFetch: number, isReset: boolean = false) => {
    if (loading || (!hasMore && !isReset)) return false;
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
            faculty_id: selectedFacultyId || undefined,
            lang: i18n.language,
          }
        });

        if (response.data && response.data.items) {
          newItems = response.data.items.map((item: any) => ({
            id: item.id.toString(),
            title: (i18n.language !== 'ro' && item.is_translated ? item.translated_title : null) || item.title || t('common.unknownTitle'),
            category: displayTitle,
            date: item.created_at || '',
            date_start: isoToRomanianDateStr(item.start_date) || "",
            date_end: isoToRomanianDateStr(item.end_date) || "",
            time_start: item.start_date ? new Date(item.start_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
            time_end: item.end_date ? new Date(item.end_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
            author: item.author_name || "",
            image: item.image_url || undefined,
            content: (i18n.language !== 'ro' && item.is_translated ? item.translated_content : null) || item.content || t('common.unknownContent'),
            location: item.location_name || t('common.unknownLocation'),
            created_at: item.created_at,
            updated_at: item.updated_at,
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
            title: item.name || t('common.unknownTitle'),
            image: item.logo_url || undefined,
            address: item.address || t('common.unknownAddress'),
            phone: item.phone || "",
            website: item.website_url || "",
            content: item.description || t('common.unknownContent'),
          }));
        }
      } else if (categoryTitle === "Facilități") {
        response = await api.get("/facilities/", {
          params: {
            page: pageToFetch,
            size: 20
          }
        });
        if (response.data && response.data.items) {
          newItems = response.data.items.map((item: any) => ({
            id: item.id.toString(),
            title: item.name || t('common.unknownTitle'),
            image: item.image_url || undefined,
            content: item.description || "",
          }));
        }
      }
      
      if (newItems.length < 20) {
        setHasMore(false);
      }
      
      setData(prev => isReset ? newItems : [...prev, ...newItems]);
      setPage(pageToFetch);
      setLoading(false);
      return true;
    } catch (err) {
      setLoading(false);
      console.error("[API] Error fetching data:", err);
      setHasError(true);
      setHasMore(false);
      return false;
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setData([]);
      setPage(1);
      setHasMore(true);
      setHasError(false);
      fetchData(1, true);
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFacultyId, categoryTitle, i18n.language]);

  const handlePress = (item: any) => {
    let type: string | undefined = undefined;
    if (categoryTitle === "Facultăți") type = "Facultate";
    else if (categoryTitle === "Facilități") type = "Facilitate";
    
    router.push({
        pathname: "/(public)/acasa/vizualizare",
        params: {
            id: item.id,
            ...(type ? { type } : {})
        }
    });
  };

  const checkPagination = (offsetY: number, layoutHeight: number, contentHeight: number) => {
    if (layoutHeight + offsetY >= contentHeight - 150 && hasMore && !loading) {
      fetchData(page + 1);
    }
  };

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.set(event.contentOffset.y);
    runOnJS(checkPagination)(
      event.contentOffset.y,
      event.layoutMeasurement.height,
      event.contentSize.height
    );
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
            <Animated.View style={headerTitleStyle}>
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
                {displayTitle}
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
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} />
        }
      >
        <View style={{ marginBottom: Spacing.lg }}>
            <CategoryHeader 
                title={displayTitle}
                filters={categoryTitle === "Facultăți" || categoryTitle === "Facilități" ? undefined : facultyFilters}
                selectedFilterId={selectedFacultyId}
                onSelectFilter={setSelectedFacultyId}
            />
        </View>

        {(loading && page === 1) || refreshing ? (
          <NewsListSkeleton />
        ) : hasError && data.length === 0 ? (
          <ErrorState onRetry={() => fetchData(1, true)} />
        ) : (
          <>
            <View style={{ gap: Spacing.xxl, paddingHorizontal: Spacing.lg }}>
              {data.map((item) => (
                  <NewsCard 
                      key={item.id}
                      variant="list"
                      title={item.title}
                      author={item.author || item.address}
                      date={getFormattedDate(item.date)}
                      image={item.image}
                      onPress={() => handlePress(item)}
                  />
              ))}
            </View>

            {loading && page > 1 && (
              <View style={{ marginTop: Spacing.lg }}>
                <NewsListSkeleton count={3} />
              </View>
            )}

            {data.length === 0 && !loading && (
                <Text style={[Typography.Paragraph1, { color: theme.text, textAlign: "center", marginTop: 40 }]}>
                    {t('category.empty')}
                </Text>
            )}
          </>
        )}

      </Animated.ScrollView>
    </View>
  );
}
