import { useColorScheme } from "@/hooks/use-color-scheme";
import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, RefreshControl, Alert } from "react-native";
import Animated, { useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { Colors, ColorScheme, Spacing } from "@/constants/theme";
import { Typography } from "@/constants/typography";
import { Carousel } from "@/components/ui/display/carousel/carousel";
import { CAROUSEL_CARD_MARGIN } from "@/components/ui/display/carousel/carousel.shared";
import { NewsCard } from "@/components/ui/display/news-card";
import { HeroSlideshow, HERO_HEIGHT } from "@/components/ui/display/hero-slideshow";
import { getFormattedDate, parseRomanianDate, isoToRomanianDateStr, getTodayRomanianDate } from "@/utils/date";
import api, { storage } from "@/services/api";
import { useTranslation } from 'react-i18next';
import { ErrorState } from "@/components/ui/display/error-state";
import { HomeSkeleton, CarouselSkeleton } from "@/components/ui/display/skeletons";


export default function HomeScreen() {
  const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
  const theme = Colors[themeName];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { t, i18n } = useTranslation();
  const [noutati, setNoutati] = useState<any[]>([]);
  const [evenimente, setEvenimente] = useState<any[]>([]);
  const [facultati, setFacultati] = useState<any[]>([]);
  const [facilitati, setFacilitati] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = useSharedValue(0);

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    scrollY.set(offsetY);
  };

  const fetchApiData = async () => {
    setHasError(false);
    let success = true;
    try {
      try {
        const response = await api.get("/announcements/", {
          params: {
            page: 1,
            size: 50,
            announcement_type: undefined,
            faculty_id: undefined,
            lang: i18n.language,
          }
        });
        if (response.data && response.data.items) {
          const apiItems = response.data.items;

          await storage.setItem('cached_announcements', JSON.stringify(apiItems));

          const apiNoutati = apiItems
            .filter((item: any) => item.type === "NOUTATE")
            .map((item: any) => ({
              id: item.id.toString(),
              title: (i18n.language !== 'ro' && item.is_translated ? item.translated_title : null) || item.title || t('common.unknownTitle'),
              category: t('home.news'),
              date: isoToRomanianDateStr(item.created_at) || t('common.unknownDate'),
              author: item.author_name || "",
              image: item.image_url || undefined,
              content: (i18n.language !== 'ro' && item.is_translated ? item.translated_content : null) || item.content || t('common.unknownContent'),
              created_at: item.created_at,
            }));

          const apiEvenimente = apiItems
            .filter((item: any) => item.type === "EVENIMENT")
            .map((item: any) => ({
              id: item.id.toString(),
              title: (i18n.language !== 'ro' && item.is_translated ? item.translated_title : null) || item.title || t('common.unknownTitle'),
              category: t('home.events'),
              date: isoToRomanianDateStr(item.created_at) || t('common.unknownDate'),
              date_start: isoToRomanianDateStr(item.start_date) || "",
              date_end: isoToRomanianDateStr(item.end_date) || "",
              time_start: item.start_date ? new Date(item.start_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
              time_end: item.end_date ? new Date(item.end_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
              author: item.author_name || "",
              image: item.image_url || undefined,
              content: (i18n.language !== 'ro' && item.is_translated ? item.translated_content : null) || item.content || t('common.unknownContent'),
              location: item.location_name || t('common.unknownLocation'),
              created_at: item.created_at,
            }));

          setNoutati(apiNoutati);
          setEvenimente(apiEvenimente);
        }
      } catch (err) {
        console.error("[API] Could not load announcements:", err);
        success = false;
        try {
          const cached = await storage.getItem('cached_announcements');
          if (cached) {
            const apiItems = JSON.parse(cached);
            setNoutati(apiItems.filter((i: any) => i.type === "NOUTATE").map((i: any) => ({
              id: i.id.toString(), title: i.title || "Titlu necunoscut", category: "Noutăți",
              date: isoToRomanianDateStr(i.created_at) || "Dată necunoscută", author: i.author_name || "",
              image: i.image_url || undefined, content: i.content || "Conținut necunoscut", created_at: i.created_at,
            })));
            setEvenimente(apiItems.filter((i: any) => i.type === "EVENIMENT").map((i: any) => ({
              id: i.id.toString(), title: i.title || "Titlu necunoscut", category: "Evenimente",
              date: isoToRomanianDateStr(i.created_at) || "Dată necunoscută",
              date_start: isoToRomanianDateStr(i.start_date) || "", date_end: isoToRomanianDateStr(i.end_date) || "",
              time_start: i.start_date ? new Date(i.start_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
              time_end: i.end_date ? new Date(i.end_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
              author: i.author_name || "", image: i.image_url || undefined,
              content: i.content || "Conținut necunoscut", location: i.location_name || "Locație necunoscută", created_at: i.created_at,
            })));
          } else if (noutati.length === 0 && evenimente.length === 0) {
            setHasError(true);
          }
        } catch { if (noutati.length === 0 && evenimente.length === 0) setHasError(true); }
      }

      try {
        const response = await api.get("/faculties/", {
          params: {
            page: 1,
            size: 50
          }
        });
        if (response.data && response.data.items) {
          const apiItems = response.data.items;
          await storage.setItem('cached_faculties', JSON.stringify(apiItems));

          const apiFaculties = apiItems.map((item: any) => ({
            id: item.id.toString(),
            title: item.name || "Titlu necunoscut",
            image: item.logo_url || undefined,
            address: item.address || "Adresă necunoscută",
            phone: item.phone || "",
            website: item.website_url || "",
            content: item.description || "Conținut necunoscut",
          }));
          setFacultati(apiFaculties);
        }
      } catch (err) {
        console.error("[API] Could not load faculties:", err);
        success = false;
        try {
          const cached = await storage.getItem('cached_faculties');
          if (cached) {
            const apiItems = JSON.parse(cached);
            setFacultati(apiItems.map((i: any) => ({
              id: i.id.toString(), title: i.name || "Titlu necunoscut", image: i.logo_url || undefined,
              address: i.address || "Adresă necunoscută", phone: i.phone || "",
              website: i.website_url || "", content: i.description || "Conținut necunoscut",
            })));
          } else if (facultati.length === 0) {
            setHasError(true);
          }
        } catch { if (facultati.length === 0) setHasError(true); }
      }

      try {
        const response = await api.get("/facilities/", {
          params: {
            page: 1,
            size: 50
          }
        });
        if (response.data && response.data.items) {
          const apiItems = response.data.items;
          await storage.setItem('cached_ugal_facilities', JSON.stringify(apiItems));

          const apiFacilities = apiItems.map((item: any) => ({
            id: item.id.toString(),
            title: item.name || "Titlu necunoscut",
            image: item.image_url || undefined,
            content: item.description || "",
            schedules: item.schedules || [],
          }));
          setFacilitati(apiFacilities);
        }
      } catch (err) {
        console.error("[API] Could not load facilities:", err);
        success = false;
        try {
          const cached = await storage.getItem('cached_ugal_facilities');
          if (cached) {
            const apiItems = JSON.parse(cached);
            setFacilitati(apiItems.map((i: any) => ({
              id: i.id.toString(), title: i.name || "Titlu necunoscut",
              image: i.image_url || undefined, content: i.description || "", schedules: i.schedules || [],
            })));
          } else if (facilitati.length === 0) {
            setHasError(true);
          }
        } catch { if (facilitati.length === 0) setHasError(true); }
      }
      setLoading(false);
      return success;
    } catch {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    const start = Date.now();
    const success = await fetchApiData();
    
    const isPageEmpty = noutati.length === 0 && evenimente.length === 0 && facultati.length === 0 && facilitati.length === 0;
    if (!success && !isPageEmpty) {
      Alert.alert(t('common.updateError'), t('home.refreshError'));
    }
    
    const elapsed = Date.now() - start;
    if (elapsed < 1000) {
      await new Promise(resolve => setTimeout(resolve, 1000 - elapsed));
    }
    setRefreshing(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchApiData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.language]);

  const announcementsForHero = [...noutati]
    .sort((a, b) => parseRomanianDate(b.date).getTime() - parseRomanianDate(a.date).getTime())
    .slice(0, 3)
    .map(item => ({
      ...item,
      category: item.category || "Noutăți"
    }));

  const heroItems = announcementsForHero.length > 0 ? announcementsForHero : [
    {
      id: "default_hero",
      title: "InsideUGAL",
      category: "Universitate",
      date: getTodayRomanianDate(),
      author: "Platforma ta universitară",
      image: null
    }
  ];

  const handleFacilityPress = (facility: any) => {
    router.push({
        pathname: "/(public)/acasa/vizualizare",
        params: {
            id: facility.id,
            type: "Facilitate"
        }
    });
  };

  const handlePress = (item: any) => {
    if (item.id === "default_hero") return;
    router.push({
        pathname: "/(public)/acasa/vizualizare",
        params: {
            id: item.id
        }
    });
  };

  const handleFacultyPress = (faculty: any) => {
    router.push({
        pathname: "/(public)/acasa/vizualizare",
        params: {
            id: faculty.id,
            type: "Facultate"
        }
    });
  };

  const activeNoutati = noutati;
  const activeEvenimente = evenimente;
  const activeFacultati = facultati;
  const activeFacilitati = facilitati;

  const isPageEmpty = noutati.length === 0 && evenimente.length === 0 && facultati.length === 0 && facilitati.length === 0;

  if ((hasError || !loading) && isPageEmpty) {
    return <ErrorState onRetry={fetchApiData} />;
  }

  if (loading && isPageEmpty) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
          <HomeSkeleton />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Animated.ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ flexGrow: 1 }}
        directionalLockEnabled={true}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            colors={[theme.primary]} 
            tintColor={theme.primary} 
            progressViewOffset={insets.top + 10}
          />
        }
      >
        <HeroSlideshow slides={heroItems} onPressItem={handlePress} scrollY={scrollY} />

        <View style={{paddingTop: Spacing.lg, paddingBottom: insets.bottom + Spacing.sm, flex: 1, width: "100%", maxWidth: 1200, alignSelf: "center"}}>
          {refreshing ? (
            <View>
              <CarouselSkeleton variant="card" />
              <CarouselSkeleton variant="card" />
              <CarouselSkeleton variant="square" count={5} />
              <CarouselSkeleton variant="square" count={5} />
            </View>
          ) : (
            <>
              {activeNoutati.length === 0 ? (
                <View style={{ marginVertical: Spacing.lg, paddingHorizontal: Spacing.lg }}>
                  <Text style={[Typography.Heading3, { color: theme.text, marginBottom: Spacing.xs }]}>{t('home.news')}</Text>
                  <Text style={[Typography.Paragraph2, { color: theme.textSecondary }]}>{t('home.noNews')}</Text>
                </View>
              ) : (
                <Carousel
                  title={t('home.news')}
                  data={activeNoutati}
                  keyExtractor={(item) => item.id}
                  viewAllHref={`/(public)/acasa/categorie?title=Noutăți`}
                  renderItem={({ item, index }) => (
                    <NewsCard
                      title={item.title}
                      category={item.category}
                      date={getFormattedDate(item.date)}
                      author={item.author}
                      image={item.image}
                      marginRight={index === activeNoutati.length - 1 ? 0 : CAROUSEL_CARD_MARGIN}
                      onPress={() => handlePress(item)}
                    />
                  )}
                />
              )}

              {activeEvenimente.length === 0 ? (
                <View style={{ marginVertical: Spacing.lg, paddingHorizontal: Spacing.lg }}>
                  <Text style={[Typography.Heading3, { color: theme.text, marginBottom: Spacing.xs }]}>{t('home.events')}</Text>
                  <Text style={[Typography.Paragraph2, { color: theme.textSecondary }]}>{t('home.noEvents')}</Text>
                </View>
              ) : (
                <Carousel
                  title={t('home.events')}
                  data={activeEvenimente}
                  keyExtractor={(item) => item.id}
                  viewAllHref="/(public)/acasa/categorie?title=Evenimente"
                  renderItem={({ item, index }) => (
                    <NewsCard
                      title={item.title}
                      category={item.category}
                      date={getFormattedDate(item.date)}
                      author={item.author}
                      image={item.image}
                      marginRight={index === activeEvenimente.length - 1 ? 0 : CAROUSEL_CARD_MARGIN}
                      onPress={() => handlePress(item)}
                    />
                  )}
                />
              )}

              {activeFacultati.length === 0 ? (
                <View style={{ marginVertical: Spacing.lg, paddingHorizontal: Spacing.lg }}>
                  <Text style={[Typography.Heading3, { color: theme.text, marginBottom: Spacing.xs }]}>{t('home.faculties')}</Text>
                  <Text style={[Typography.Paragraph2, { color: theme.textSecondary }]}>{t('home.noFaculties')}</Text>
                </View>
              ) : (
                <Carousel
                  title={t('home.faculties')}
                  data={activeFacultati}
                  keyExtractor={(item) => item.id}
                  viewAllHref="/(public)/acasa/categorie?title=Facultăți"
                  renderItem={({ item, index }) => (
                    <NewsCard
                      variant="square"
                      title={item.title}
                      image={item.image}
                      marginRight={index === activeFacultati.length - 1 ? 0 : CAROUSEL_CARD_MARGIN}
                      onPress={() => handleFacultyPress(item)}
                    />
                  )}
                />
              )}

              {activeFacilitati.length === 0 ? (
                <View style={{ marginVertical: Spacing.lg, paddingHorizontal: Spacing.lg }}>
                  <Text style={[Typography.Heading3, { color: theme.text, marginBottom: Spacing.xs }]}>{t('home.facilities')}</Text>
                  <Text style={[Typography.Paragraph2, { color: theme.textSecondary }]}>{t('home.noFacilities')}</Text>
                </View>
              ) : (
                <Carousel
                  title={t('home.facilities')}
                  data={activeFacilitati}
                  keyExtractor={(item) => item.id}
                  viewAllHref="/(public)/acasa/categorie?title=Facilități"
                  renderItem={({ item, index }) => (
                    <NewsCard
                      variant="square"
                      title={item.title}
                      image={item.image}
                      marginRight={index === activeFacilitati.length - 1 ? 0 : CAROUSEL_CARD_MARGIN}
                      onPress={() => handleFacilityPress(item)}
                    />
                  )}
                />
              )}
            </>
          )}
        </View>
      </Animated.ScrollView>
    </View>
  );
}