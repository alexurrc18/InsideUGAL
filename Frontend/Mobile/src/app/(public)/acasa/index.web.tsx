import { useState, useEffect } from "react";
import { View, ScrollView, Text, RefreshControl } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Colors, Spacing } from "@/constants/theme";
import { Typography } from "@/constants/typography";

import { WebContainer } from "@/components/ui/layout/web-container";
import { Carousel } from "@/components/ui/display/carousel/carousel";
import { CAROUSEL_CARD_MARGIN } from "@/components/ui/display/carousel/carousel.shared";
import { NewsCard } from "@/components/ui/display/news-card";
import { HeroSlideshow, HERO_HEIGHT } from "@/components/ui/display/hero-slideshow.web";
import { HomeHighlights } from "@/components/ui/display/home-highlights";
import { NAVBAR_HEIGHT } from "@/components/ui/navigation/web-navbar";
import { getFormattedDate, parseRomanianDate, isoToRomanianDateStr, getTodayRomanianDate } from "@/utils/date";
import { useWebScrollAware } from "@/contexts/web-scroll-context";
import api from "@/services/api";
import { useTranslation } from 'react-i18next';
import { ErrorState } from "@/components/ui/display/error-state";
import { HomeSkeleton } from "@/components/ui/display/skeletons";
import { Seo } from "@/components/seo";
import { eventHref, anuntHref } from "@/utils/article-url";

export default function HomeScreen() {
  const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
  const theme = Colors[themeName];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Navbar transparent pana trece de hero. Pragul = inaltimea hero-ului minus navbar.
  const scrollProps = useWebScrollAware(HERO_HEIGHT - NAVBAR_HEIGHT);

  const { t, i18n } = useTranslation();
  const [noutati, setNoutati] = useState<any[]>([]);
  const [evenimente, setEvenimente] = useState<any[]>([]);
  const [facultati, setFacultati] = useState<any[]>([]);
  const [facilitati, setFacilitati] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchApiData = async () => {
    setHasError(false);
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

          const apiNoutati = apiItems
            .filter((item: any) => item.type === "NOUTATE")
            .map((item: any) => ({
              id: item.id.toString(),
              title: (i18n.language !== 'ro' && item.is_translated ? item.translated_title : null) || item.title || t('common.unknownTitle'),
              category: t('home.news'),
              date: item.created_at || '',
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
            }));

          setNoutati(apiNoutati);
          setEvenimente(apiEvenimente);
        }
      } catch (err) {
        console.error("[API] Could not load announcements:", err);
        if (noutati.length === 0 && evenimente.length === 0) {
          setHasError(true);
        }
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
        if (facultati.length === 0) {
          setHasError(true);
        }
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
        if (facilitati.length === 0) {
          setHasError(true);
        }
      }
    setLoading(false);
    } catch {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchApiData();
    setRefreshing(false);
  };

  useEffect(() => {
    const run = async () => {
      await fetchApiData();
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.language]);

  // Ultimele 3 postari (Noutăți + Evenimente), cele mai recente primele, pentru hero.
  const announcementsForHero = [...noutati, ...evenimente]
    .sort((a, b) => parseRomanianDate(b.date).getTime() - parseRomanianDate(a.date).getTime())
    .slice(0, 3);

  const heroItems = announcementsForHero.length > 0 ? announcementsForHero : [
    {
      id: "default_hero",
      title: "InsideUGAL",
      category: t('common.university'),
      date: getTodayRomanianDate(),
      author: t('common.universityPlatform'),
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
    // Evenimentele si anunturile au URL curat; restul raman pe vizualizare.
    if (item.category === t('home.events')) {
        router.push(eventHref(item) as any);
        return;
    }
    if (item.category === t('home.news')) {
        router.push(anuntHref(item) as any);
        return;
    }
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

  // Sectiunea "Recente": un anunt mare (featured) + 3 compacte, sortate după created_at descrescător.
  const allAnnouncements = [...activeNoutati, ...activeEvenimente].sort((a, b) => {
    const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return timeB - timeA;
  });
  const latest4 = allAnnouncements.slice(0, 4).map((item) => ({
    ...item,
    date: item.created_at || '',
    date_start: undefined,
  }));
  const featuredItem = latest4[0];
  const highlightItems = latest4.slice(1, 4);

  const isPageEmpty = noutati.length === 0 && evenimente.length === 0 && facultati.length === 0 && facilitati.length === 0;

  if ((hasError || !loading) && isPageEmpty) {
    return <ErrorState onRetry={fetchApiData} />;
  }

  if (loading && isPageEmpty) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} {...scrollProps}>
          <HomeSkeleton />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Seo
        title="Anunțuri și evenimente UGAL"
        description="Cele mai noi anunțuri, evenimente, facultăți și facilități pentru studenții Universității „Dunărea de Jos” din Galați."
      />
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1 }}
          {...scrollProps}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} />
          }
        >
          {/* Hero slideshow full-bleed: ultimele 3 anunturi, auto-rotire + puncte. */}
          <HeroSlideshow slides={heroItems} onPressItem={handlePress} />

          {/* Sectiune intre hero si carusele: 3 carduri compacte + 1 card mare. */}
          <HomeHighlights 
            title="Recente" 
            featured={featuredItem} 
            items={highlightItems} 
            onPressItem={handlePress} 
          />

          <WebContainer style={{ paddingTop: Spacing.xl3, paddingBottom: insets.bottom + Spacing.sm, flex: 1 }}>
            {activeNoutati.length === 0 ? (
              <View style={{ marginVertical: Spacing.xl3 }}>
                <View style={{ paddingHorizontal: Spacing.lg }}>
                  <Text accessibilityRole="header" {...({ "aria-level": 2 } as any)} style={[Typography.Heading1, { color: theme.text, marginBottom: Spacing.xs }]}>{t('home.news')}</Text>
                  <Text style={[Typography.Paragraph2, { color: theme.textSecondary }]}>
                    {hasError ? t('home.loadErrorNews') : t('home.emptyNews')}
                  </Text>
                </View>
              </View>
            ) : (
              <Carousel
                title={t('home.news')}
                data={activeNoutati.slice(0, 3)}
                keyExtractor={(item) => item.id}
                viewAllHref="/(public)/acasa/categorie?title=Noutăți"
                renderItem={({ item, index }) => (
                  <NewsCard
                    title={item.title}
                    category={item.category}
                    date={getFormattedDate(item.date)}
                    author={item.author}
                    image={item.image}
                    marginRight={index === Math.min(activeNoutati.length, 3) - 1 ? 0 : CAROUSEL_CARD_MARGIN}
                    onPress={() => handlePress(item)}
                  />
                )}
              />
            )}

            {activeEvenimente.length === 0 ? (
              <View style={{ marginVertical: Spacing.xl3 }}>
                <View style={{ paddingHorizontal: Spacing.lg }}>
                  <Text accessibilityRole="header" {...({ "aria-level": 2 } as any)} style={[Typography.Heading1, { color: theme.text, marginBottom: Spacing.xs }]}>{t('home.events')}</Text>
                  <Text style={[Typography.Paragraph2, { color: theme.textSecondary }]}>
                    {hasError ? t('home.loadErrorEvents') : t('home.emptyEvents')}
                  </Text>
                </View>
              </View>
            ) : (
              <Carousel
                title={t('home.events')}
                data={activeEvenimente.slice(0, 3)}
                keyExtractor={(item) => item.id}
                viewAllHref="/(public)/acasa/categorie?title=Evenimente"
                renderItem={({ item, index }) => (
                  <NewsCard
                    title={item.title}
                    category={item.category}
                    date={getFormattedDate(item.date)}
                    author={item.author}
                    image={item.image}
                    marginRight={index === Math.min(activeEvenimente.length, 3) - 1 ? 0 : CAROUSEL_CARD_MARGIN}
                    onPress={() => handlePress(item)}
                  />
                )}
              />
            )}

            {activeFacultati.length === 0 ? (
              <View style={{ marginVertical: Spacing.xl3 }}>
                <View style={{ paddingHorizontal: Spacing.lg }}>
                  <Text accessibilityRole="header" {...({ "aria-level": 2 } as any)} style={[Typography.Heading1, { color: theme.text, marginBottom: Spacing.xs }]}>{t('home.faculties')}</Text>
                  <Text style={[Typography.Paragraph2, { color: theme.textSecondary }]}>
                    {hasError ? t('home.loadErrorFaculties') : t('home.emptyFaculties')}
                  </Text>
                </View>
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
              <View style={{ marginVertical: Spacing.xl3 }}>
                <View style={{ paddingHorizontal: Spacing.lg }}>
                  <Text accessibilityRole="header" {...({ "aria-level": 2 } as any)} style={[Typography.Heading1, { color: theme.text, marginBottom: Spacing.xs }]}>{t('home.facilities')}</Text>
                  <Text style={[Typography.Paragraph2, { color: theme.textSecondary }]}>
                    {hasError ? t('home.loadErrorFacilities') : t('home.emptyFacilities')}
                  </Text>
                </View>
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
          </WebContainer>
        </ScrollView>
      </View>
  );
}
