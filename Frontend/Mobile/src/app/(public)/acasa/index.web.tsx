import { useState, useEffect } from "react";
import { View, ScrollView, Text, ActivityIndicator, RefreshControl } from "react-native";
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
import MOCK_DATA from "@/constants/mock-data.json";
import api, { storage } from "@/services/api";
import { ErrorState } from "@/components/ui/display/error-state";

export default function HomeScreen() {
  const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
  const theme = Colors[themeName];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Navbar transparent pana trece de hero. Pragul = inaltimea hero-ului minus navbar.
  const scrollProps = useWebScrollAware(HERO_HEIGHT - NAVBAR_HEIGHT);

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
            faculty_id: undefined
          }
        });
        if (response.data && response.data.items) {
          const apiItems = response.data.items;
          
          await storage.setItem('cached_announcements', JSON.stringify(apiItems));

          const apiNoutati = apiItems
            .filter((item: any) => item.type === "NOUTATE")
            .map((item: any) => ({
              id: item.id.toString(),
              title: item.title || "Titlu necunoscut",
              category: "Noutăți",
              date: isoToRomanianDateStr(item.created_at) || "Dată necunoscută",
              author: item.author || "Autor necunoscut",
              image: item.image_url || undefined,
              content: item.content || "Conținut necunoscut",
              created_at: item.created_at,
            }));

          const apiEvenimente = apiItems
            .filter((item: any) => item.type === "EVENIMENT")
            .map((item: any) => ({
              id: item.id.toString(),
              title: item.title || "Titlu necunoscut",
              category: "Evenimente",
              date: isoToRomanianDateStr(item.created_at) || "Dată necunoscută",
              date_start: isoToRomanianDateStr(item.start_date) || "",
              date_end: isoToRomanianDateStr(item.end_date) || "",
              time_start: item.start_date ? new Date(item.start_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
              time_end: item.end_date ? new Date(item.end_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
              author: item.author || "Autor necunoscut",
              image: item.image_url || undefined,
              content: item.content || "Conținut necunoscut",
              location: item.location_name || "Locație necunoscută",
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
          await storage.setItem('cached_faculties', JSON.stringify(apiItems));

          const apiFaculties = apiItems.map((item: any) => ({
            id: item.id.toString(),
            title: item.name || "Titlu necunoscut",
            image: item.image_url || undefined,
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
        const response = await api.get("/locations/", {
          params: {
            page: 1,
            size: 50
          }
        });
        if (response.data && response.data.items) {
          const apiItems = response.data.items;
          await storage.setItem('cached_facilities', JSON.stringify(apiItems));

          const apiFacilities = apiItems.map((item: any) => ({
            id: item.id.toString(),
            title: item.name || "Titlu necunoscut",
            image: item.image_url || undefined,
            address: item.address || "Adresă necunoscută",
            phone: item.phone || "",
            website: item.website_url || "",
            content: item.name || "Conținut necunoscut",
            schedule: item.schedule || "",
          }));
          setFacilitati(apiFacilities);
        }
      } catch (err) {
        console.error("[API] Could not load facilities/locations:", err);
        if (facilitati.length === 0) {
          setHasError(true);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchApiData();
    setRefreshing(false);
  };

  useEffect(() => {
    const loadCache = async () => {
      try {
        const cachedAnnouncements = await storage.getItem('cached_announcements');
        const cachedFaculties = await storage.getItem('cached_faculties');
        const cachedFacilities = await storage.getItem('cached_facilities');

        let hasData = false;

        if (cachedAnnouncements) {
          const apiItems = JSON.parse(cachedAnnouncements);
          if (Array.isArray(apiItems) && apiItems.length > 0) {
            const apiNoutati = apiItems
              .filter((item: any) => item.type === "NOUTATE")
              .map((item: any) => ({
                id: item.id.toString(),
                title: item.title || "Titlu necunoscut",
                category: "Noutăți",
                date: isoToRomanianDateStr(item.created_at) || "Dată necunoscută",
                author: item.author || "Autor necunoscut",
                image: item.image_url || undefined,
                content: item.content || "Conținut necunoscut",
                created_at: item.created_at,
              }));

            const apiEvenimente = apiItems
              .filter((item: any) => item.type === "EVENIMENT")
              .map((item: any) => ({
                id: item.id.toString(),
                title: item.title || "Titlu necunoscut",
                category: "Evenimente",
                date: isoToRomanianDateStr(item.created_at) || "Dată necunoscută",
                date_start: isoToRomanianDateStr(item.start_date) || "",
                date_end: isoToRomanianDateStr(item.end_date) || "",
                time_start: item.start_date ? new Date(item.start_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
                time_end: item.end_date ? new Date(item.end_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
                author: item.author || "Autor necunoscut",
                image: item.image_url || undefined,
                content: item.content || "Conținut necunoscut",
                location: item.location_name || "Locație necunoscută",
                created_at: item.created_at,
              }));

            setNoutati(apiNoutati);
            setEvenimente(apiEvenimente);
            hasData = true;
          }
        }

        if (cachedFaculties) {
          const apiItems = JSON.parse(cachedFaculties);
          if (Array.isArray(apiItems) && apiItems.length > 0) {
            const apiFaculties = apiItems.map((item: any) => ({
              id: item.id.toString(),
              title: item.name || "Titlu necunoscut",
              image: item.image_url || undefined,
              address: item.address || "Adresă necunoscută",
              phone: item.phone || "",
              website: item.website_url || "",
              content: item.description || "Conținut necunoscut",
            }));
            setFacultati(apiFaculties);
            hasData = true;
          }
        }

        if (cachedFacilities) {
          const apiItems = JSON.parse(cachedFacilities);
          if (Array.isArray(apiItems) && apiItems.length > 0) {
            const apiFacilities = apiItems.map((item: any) => ({
              id: item.id.toString(),
              title: item.name || "Titlu necunoscut",
              image: item.image_url || undefined,
              address: item.address || "Adresă necunoscută",
              phone: item.phone || "",
              website: item.website_url || "",
              content: item.name || "Conținut necunoscut",
              schedule: item.schedule || "",
            }));
            setFacilitati(apiFacilities);
            hasData = true;
          }
        }

        if (hasData) {
          setLoading(false);
        }
      } catch (e) {
        console.warn("[Cache] Could not load cached items:", e);
      }
    };

    const run = async () => {
      await loadCache();
      fetchApiData();
    };
    run();
  }, []);

  // Ultimele 3 anunturi (Noutăți), cele mai recente primele, pentru hero.
  const announcementsForHero = [...noutati]
    .sort((a, b) => parseRomanianDate(b.date).getTime() - parseRomanianDate(a.date).getTime())
    .slice(0, 3);

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

  // Sectiunea "Ultimele 4 anunțuri": un anunt mare (featured) + 3 compacte, sortate după created_at descrescător.
  const allAnnouncements = [...activeNoutati, ...activeEvenimente].sort((a, b) => {
    const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return timeB - timeA;
  });
  const latest4 = allAnnouncements.slice(0, 4).map((item) => ({
    ...item,
    date: isoToRomanianDateStr(item.created_at) || "Dată necunoscută",
    date_start: undefined,
  }));
  const featuredItem = latest4[0];
  const highlightItems = latest4.slice(1, 4);

  const isPageEmpty = noutati.length === 0 && evenimente.length === 0 && facultati.length === 0 && facilitati.length === 0;

  if (hasError || (isPageEmpty && !loading)) {
    return <ErrorState />;
  }

  if (loading && isPageEmpty) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background, justifyContent: "center", alignItems: "center", minHeight: 400 }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
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
            title="Ultimele 4 anunțuri" 
            featured={featuredItem} 
            items={highlightItems} 
            onPressItem={handlePress} 
          />

          <WebContainer style={{ paddingTop: Spacing.xl3, paddingBottom: insets.bottom + Spacing.sm, flex: 1 }}>
            {activeNoutati.length === 0 ? (
              <View style={{ marginVertical: Spacing.lg }}>
                <View style={{ paddingBottom: Spacing.xs, borderBottomWidth: 1, borderBottomColor: "#E5E7EB", marginBottom: Spacing.sm }}>
                  <Text style={[Typography.Heading3, { color: theme.text }]}>Noutăți</Text>
                </View>
                <Text style={[Typography.Paragraph2, { color: theme.textSecondary }]}>Nu există noutăți.</Text>
              </View>
            ) : (
              <Carousel
                title="Noutăți"
                data={activeNoutati}
                keyExtractor={(item) => item.id}
                viewAllHref="/(public)/acasa/categorie?title=Noutăți"
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
              <View style={{ marginVertical: Spacing.lg }}>
                <View style={{ paddingBottom: Spacing.xs, borderBottomWidth: 1, borderBottomColor: "#E5E7EB", marginBottom: Spacing.sm }}>
                  <Text style={[Typography.Heading3, { color: theme.text }]}>Evenimente</Text>
                </View>
                <Text style={[Typography.Paragraph2, { color: theme.textSecondary }]}>Nu există evenimente.</Text>
              </View>
            ) : (
              <Carousel
                title="Evenimente"
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
              <View style={{ marginVertical: Spacing.lg }}>
                <View style={{ paddingBottom: Spacing.xs, borderBottomWidth: 1, borderBottomColor: "#E5E7EB", marginBottom: Spacing.sm }}>
                  <Text style={[Typography.Heading3, { color: theme.text }]}>Facultăți</Text>
                </View>
                <Text style={[Typography.Paragraph2, { color: theme.textSecondary }]}>Nu există facultăți.</Text>
              </View>
            ) : (
              <Carousel
                title="Facultăți"
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
              <View style={{ marginVertical: Spacing.lg }}>
                <View style={{ paddingBottom: Spacing.xs, borderBottomWidth: 1, borderBottomColor: "#E5E7EB", marginBottom: Spacing.sm }}>
                  <Text style={[Typography.Heading3, { color: theme.text }]}>Facilități</Text>
                </View>
                <Text style={[Typography.Paragraph2, { color: theme.textSecondary }]}>Nu există facilități.</Text>
              </View>
            ) : (
              <Carousel
                title="Facilități"
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
