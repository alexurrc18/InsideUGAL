import { useState, useEffect } from "react";
import { View, ScrollView, Text, ActivityIndicator } from "react-native";
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
import api from "@/services/api";
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

  useEffect(() => {
    const fetchApiData = async () => {
      setLoading(true);
      setHasError(false);
      try {
        try {
          const response = await api.get("/announcements/", {
            params: {
              page: 1,
              size: 50
            }
          });
          if (response.data && response.data.items) {
            const apiItems = response.data.items;
            
            const apiNoutati = apiItems
              .filter((item: any) => item.type === "NOUTATE")
              .map((item: any) => ({
                id: item.id.toString(),
                title: item.title,
                category: "Noutăți",
                date: isoToRomanianDateStr(item.created_at) || "--",
                author: item.location_name || "",
                image: item.image_url || undefined,
                content: item.content,
              }));

            const apiEvenimente = apiItems
              .filter((item: any) => item.type === "EVENIMENT")
              .map((item: any) => ({
                id: item.id.toString(),
                title: item.title,
                category: "Evenimente",
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

            setNoutati(apiNoutati);
            setEvenimente(apiEvenimente);
          }
        } catch (err) {
          console.error("[API] Could not load announcements:", err);
          setHasError(true);
        }

        try {
          const response = await api.get("/faculties/", {
            params: {
              page: 1,
              size: 50
            }
          });
          if (response.data && response.data.items) {
            const apiFaculties = response.data.items.map((item: any) => ({
              id: item.id.toString(),
              title: item.name,
              image: item.image_url || undefined,
              address: item.address || "",
              phone: item.phone || "",
              website: item.website_url || "",
              content: item.description || "",
            }));
            setFacultati(apiFaculties);
          }
        } catch (err) {
          console.error("[API] Could not load faculties:", err);
          setHasError(true);
        }

        try {
          const response = await api.get("/locations/", {
            params: {
              page: 1,
              size: 50
            }
          });
          if (response.data && response.data.items) {
            const apiFacilities = response.data.items.map((item: any) => ({
              id: item.id.toString(),
              title: item.name,
              image: item.image_url || undefined,
              address: item.address || "",
              phone: item.phone || "",
              website: item.website_url || "",
              content: item.name,
              schedule: item.schedule || "",
            }));
            setFacilitati(apiFacilities);
          }
        } catch (err) {
          console.error("[API] Could not load facilities/locations:", err);
          setHasError(true);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchApiData();
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

  // Sectiunea "Recomandate": un anunt mare (featured) + 3 compacte, fara duplicat.
  const allEvents = [...evenimente, ...noutati];
  const featuredItem = evenimente[0] ?? noutati[0];
  const highlightItems = allEvents.filter((e) => e.id !== featuredItem?.id).slice(0, 3);

  const handleFacilityPress = (facility: any) => {
    router.push({
        pathname: "/(public)/acasa/vizualizare",
        params: {
            type: "Facilitate",
            title: facility.title,
            content: facility.content,
            image: facility.image,
            address: facility.address,
            phone: facility.phone,
            website: facility.website,
            schedule: facility.schedule
        }
    });
  };

  const handlePress = (item: any) => {
    if (item.id === "default_hero") return;
    router.push({
        pathname: "/(public)/acasa/vizualizare",
        params: {
            type: item.category === "Evenimente" ? "Eveniment" : "Anunț",
            title: item.title,
            category: item.category,
            content: item.content,
            image: item.image,
            location: item.location,
            date_start: item.date_start,
            date_end: item.date_end,
            time_start: item.time_start,
            time_end: item.time_end,
            date: item.date_start || item.date
        }
    });
  };

  const handleFacultyPress = (faculty: any) => {
    router.push({
        pathname: "/(public)/acasa/vizualizare",
        params: {
            type: "Facultate",
            title: faculty.title,
            content: faculty.content,
            image: faculty.image,
            address: faculty.address,
            phone: faculty.phone,
            website: faculty.website
        }
    });
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  const isPageEmpty = noutati.length === 0 && evenimente.length === 0 && facultati.length === 0 && facilitati.length === 0;

  if (hasError || isPageEmpty) {
    return <ErrorState />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} {...scrollProps}>
        {/* Hero slideshow full-bleed: ultimele 3 anunturi, auto-rotire + puncte. */}
        <HeroSlideshow slides={heroItems} onPressItem={handlePress} />

        {/* Sectiune intre hero si carusele: 3 carduri compacte + 1 card mare. */}
        <HomeHighlights featured={featuredItem} items={highlightItems} onPressItem={handlePress} />

        <WebContainer style={{ paddingTop: Spacing.xl3, paddingBottom: insets.bottom + Spacing.sm, flex: 1 }}>
          {noutati.length === 0 ? (
            <View style={{ marginVertical: Spacing.lg }}>
              <View style={{ paddingBottom: Spacing.xs, borderBottomWidth: 1, borderBottomColor: "#E5E7EB", marginBottom: Spacing.sm }}>
                <Text style={[Typography.Heading3, { color: theme.text }]}>Noutăți</Text>
              </View>
              <Text style={[Typography.Paragraph2, { color: theme.textSecondary }]}>Nu există noutăți.</Text>
            </View>
          ) : (
            <Carousel
              title="Noutăți"
              data={noutati}
              keyExtractor={(item) => item.id}
              viewAllHref="/(public)/acasa/categorie?title=Noutăți"
              renderItem={({ item, index }) => (
                <NewsCard
                  title={item.title}
                  category={item.category}
                  date={getFormattedDate(item.date)}
                  author={item.author}
                  image={item.image}
                  marginRight={index === noutati.length - 1 ? 0 : CAROUSEL_CARD_MARGIN}
                  onPress={() => handlePress(item)}
                />
              )}
            />
          )}

          {evenimente.length === 0 ? (
            <View style={{ marginVertical: Spacing.lg }}>
              <View style={{ paddingBottom: Spacing.xs, borderBottomWidth: 1, borderBottomColor: "#E5E7EB", marginBottom: Spacing.sm }}>
                <Text style={[Typography.Heading3, { color: theme.text }]}>Evenimente</Text>
              </View>
              <Text style={[Typography.Paragraph2, { color: theme.textSecondary }]}>Nu există evenimente.</Text>
            </View>
          ) : (
            <Carousel
              title="Evenimente"
              data={evenimente}
              keyExtractor={(item) => item.id}
              viewAllHref="/(public)/acasa/categorie?title=Evenimente"
              renderItem={({ item, index }) => (
                <NewsCard
                  title={item.title}
                  category={item.category}
                  date={getFormattedDate(item.date_start || item.date)}
                  author={item.author}
                  image={item.image}
                  marginRight={index === evenimente.length - 1 ? 0 : CAROUSEL_CARD_MARGIN}
                  onPress={() => handlePress(item)}
                />
              )}
            />
          )}

          {facultati.length === 0 ? (
            <View style={{ marginVertical: Spacing.lg }}>
              <View style={{ paddingBottom: Spacing.xs, borderBottomWidth: 1, borderBottomColor: "#E5E7EB", marginBottom: Spacing.sm }}>
                <Text style={[Typography.Heading3, { color: theme.text }]}>Facultăți</Text>
              </View>
              <Text style={[Typography.Paragraph2, { color: theme.textSecondary }]}>Nu există facultăți.</Text>
            </View>
          ) : (
            <Carousel
              title="Facultăți"
              data={facultati}
              keyExtractor={(item) => item.id}
              viewAllHref="/(public)/acasa/categorie?title=Facultăți"
              renderItem={({ item, index }) => (
                <NewsCard
                  variant="square"
                  title={item.title}
                  image={item.image}
                  marginRight={index === facultati.length - 1 ? 0 : CAROUSEL_CARD_MARGIN}
                  onPress={() => handleFacultyPress(item)}
                />
              )}
            />
          )}

          {facilitati.length === 0 ? (
            <View style={{ marginVertical: Spacing.lg }}>
              <View style={{ paddingBottom: Spacing.xs, borderBottomWidth: 1, borderBottomColor: "#E5E7EB", marginBottom: Spacing.sm }}>
                <Text style={[Typography.Heading3, { color: theme.text }]}>Facilități</Text>
              </View>
              <Text style={[Typography.Paragraph2, { color: theme.textSecondary }]}>Nu există facilități.</Text>
            </View>
          ) : (
            <Carousel
              title="Facilități"
              data={facilitati}
              keyExtractor={(item) => item.id}
              viewAllHref="/(public)/acasa/categorie?title=Facilități"
              renderItem={({ item, index }) => (
                <NewsCard
                  variant="square"
                  title={item.title}
                  image={item.image}
                  marginRight={index === facilitati.length - 1 ? 0 : CAROUSEL_CARD_MARGIN}
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
