import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, useColorScheme, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { Colors, ColorScheme, Spacing } from "@/constants/theme";
import { Typography } from "@/constants/typography";
import { Carousel } from "@/components/ui/display/carousel/carousel";
import { CAROUSEL_CARD_MARGIN } from "@/components/ui/display/carousel/carousel.shared";
import { NewsCard } from "@/components/ui/display/news-card";
import { HeroSlideshow } from "@/components/ui/display/hero-slideshow";
import { getFormattedDate, parseRomanianDate, isoToRomanianDateStr, getTodayRomanianDate } from "@/utils/date";
import MOCK_DATA from "@/constants/mock-data.json";
import api from "@/services/api";
import { ErrorState } from "@/components/ui/display/error-state";

export default function HomeScreen() {
  const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
  const theme = Colors[themeName];
  const insets = useSafeAreaInsets();
  const router = useRouter();

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
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
        <HeroSlideshow slides={heroItems} onPressItem={handlePress} />

        <View style={{paddingTop: Spacing.lg, paddingBottom: insets.bottom + Spacing.sm, flex: 1, width: "100%", maxWidth: 1200, alignSelf: "center"}}>
          {noutati.length === 0 ? (
            <View style={{ marginVertical: Spacing.lg, paddingHorizontal: Spacing.lg }}>
              <Text style={[Typography.Heading3, { color: theme.text, marginBottom: Spacing.xs }]}>Noutăți</Text>
              <Text style={[Typography.Paragraph2, { color: theme.textSecondary }]}>Nu s-au putut găsi noutăți.</Text>
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
            <View style={{ marginVertical: Spacing.lg, paddingHorizontal: Spacing.lg }}>
              <Text style={[Typography.Heading3, { color: theme.text, marginBottom: Spacing.xs }]}>Evenimente</Text>
              <Text style={[Typography.Paragraph2, { color: theme.textSecondary }]}>Nu s-au putut găsi evenimente.</Text>
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
            <View style={{ marginVertical: Spacing.lg, paddingHorizontal: Spacing.lg }}>
              <Text style={[Typography.Heading3, { color: theme.text, marginBottom: Spacing.xs }]}>Facultăți</Text>
              <Text style={[Typography.Paragraph2, { color: theme.textSecondary }]}>Nu s-au putut găsi facultăți.</Text>
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
            <View style={{ marginVertical: Spacing.lg, paddingHorizontal: Spacing.lg }}>
              <Text style={[Typography.Heading3, { color: theme.text, marginBottom: Spacing.xs }]}>Facilități</Text>
              <Text style={[Typography.Paragraph2, { color: theme.textSecondary }]}>Nu s-au putut găsi facilități.</Text>
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
        </View>
      </ScrollView>
    </View>
  );
}