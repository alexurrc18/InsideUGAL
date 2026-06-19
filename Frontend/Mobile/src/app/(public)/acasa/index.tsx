import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, useColorScheme, RefreshControl, Platform, Pressable, Alert, Animated, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, ColorScheme, Spacing } from "@/constants/theme";
import { Typography } from "@/constants/typography";
import { Carousel } from "@/components/ui/display/carousel/carousel";
import { CAROUSEL_CARD_MARGIN } from "@/components/ui/display/carousel/carousel.shared";
import { NewsCard } from "@/components/ui/display/news-card";
import { HeroSlideshow, HERO_HEIGHT } from "@/components/ui/display/hero-slideshow";
import { getFormattedDate, parseRomanianDate, isoToRomanianDateStr, getTodayRomanianDate } from "@/utils/date";
import api, { storage } from "@/services/api";
import { ErrorState } from "@/components/ui/display/error-state";
import { HomeSkeleton, CarouselSkeleton } from "@/components/ui/display/skeletons";
import { InteractiveGlass } from "@/components/ui/layout/interactive-glass";
import BellIcon from "@/assets/icons/svg/bell.svg";

const AnimatedBell = Animated.createAnimatedComponent(BellIcon);

function hexToRgba(hex: string, alpha: number) {
  const cleanHex = hex.replace("#", "");
  let r = 0, g = 0, b = 0;
  if (cleanHex.length === 3) {
    r = parseInt(cleanHex[0] + cleanHex[0], 16);
    g = parseInt(cleanHex[1] + cleanHex[1], 16);
    b = parseInt(cleanHex[2] + cleanHex[2], 16);
  } else if (cleanHex.length === 6) {
    r = parseInt(cleanHex.substring(0, 2), 16);
    g = parseInt(cleanHex.substring(2, 4), 16);
    b = parseInt(cleanHex.substring(4, 6), 16);
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

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
  const [refreshing, setRefreshing] = useState(false);
  const headerAnim = React.useRef(new Animated.Value(0)).current;
  const isPastThreshold = React.useRef(false);

  const bellColor = headerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [ColorScheme.white, theme.text],
  });

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const headerHeight = insets.top + 56;
    const threshold = HERO_HEIGHT - headerHeight;
    const isPast = offsetY >= threshold;

    if (isPast !== isPastThreshold.current) {
      isPastThreshold.current = isPast;
      Animated.timing(headerAnim, {
        toValue: isPast ? 1 : 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  };

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
    const start = Date.now();
    await fetchApiData();
    const elapsed = Date.now() - start;
    if (elapsed < 1000) {
      await new Promise(resolve => setTimeout(resolve, 1000 - elapsed));
    }
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

  const handleNotificationsPress = () => {
    Alert.alert("Notificări", "Nu aveți notificări noi.");
  };

  const activeNoutati = noutati;
  const activeEvenimente = evenimente;
  const activeFacultati = facultati;
  const activeFacilitati = facilitati;

  const isPageEmpty = noutati.length === 0 && evenimente.length === 0 && facultati.length === 0 && facilitati.length === 0;

  if (hasError || (isPageEmpty && !loading)) {
    return <ErrorState />;
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
      {/* Fixed Header */}
      <Animated.View 
        style={{ 
          position: "absolute", 
          top: 0, 
          left: 0, 
          right: 0, 
          paddingTop: insets.top + Spacing.sm, 
          paddingBottom: Spacing.sm,
          paddingHorizontal: Spacing.lg, 
          flexDirection: "row", 
          justifyContent: "space-between", 
          alignItems: "center", 
          zIndex: 100,
        }}
      >
        {/* Animated gradient background overlay */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              opacity: headerAnim,
            }
          ]}
        >
          <LinearGradient
            colors={[
              hexToRgba(theme.background, 0.8),
              hexToRgba(theme.background, 0.8),
              hexToRgba(theme.background, 0.0)
            ]}
            locations={[0.0, 0.8, 1.0]}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        {/* Permanent Logo */}
        <Image 
          source={require("@/assets/images/logo.png")}
          style={{ width: 40, height: 40 }}
          contentFit="contain"
        />

        {Platform.OS === 'ios' ? (
          <Pressable
            onPress={handleNotificationsPress}
            style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
          >
            <InteractiveGlass size={45} style={{ shadowColor: theme.text, shadowOpacity: 0.2, shadowRadius: 5 }}>
              <AnimatedBell width={25} height={25} color={bellColor} />
            </InteractiveGlass>
          </Pressable>
        ) : (
          <Pressable
            onPress={handleNotificationsPress}
            style={({ pressed }) => [
              { 
                opacity: pressed ? 0.85 : 1,
                width: 45,
                height: 45,
                borderRadius: 22.5,
                backgroundColor: "rgba(255, 255, 255, 0.15)",
                alignItems: "center",
                justifyContent: "center"
              }
            ]}
          >
            <AnimatedBell width={26} height={26} color={bellColor} />
          </Pressable>
        )}
      </Animated.View>

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
        <HeroSlideshow slides={heroItems} onPressItem={handlePress} />

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
                  <Text style={[Typography.Heading3, { color: theme.text, marginBottom: Spacing.xs }]}>Noutăți</Text>
                  <Text style={[Typography.Paragraph2, { color: theme.textSecondary }]}>Nu s-au putut găsi noutăți.</Text>
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
                <View style={{ marginVertical: Spacing.lg, paddingHorizontal: Spacing.lg }}>
                  <Text style={[Typography.Heading3, { color: theme.text, marginBottom: Spacing.xs }]}>Evenimente</Text>
                  <Text style={[Typography.Paragraph2, { color: theme.textSecondary }]}>Nu s-au putut găsi evenimente.</Text>
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
                <View style={{ marginVertical: Spacing.lg, paddingHorizontal: Spacing.lg }}>
                  <Text style={[Typography.Heading3, { color: theme.text, marginBottom: Spacing.xs }]}>Facultăți</Text>
                  <Text style={[Typography.Paragraph2, { color: theme.textSecondary }]}>Nu s-au putut găsi facultăți.</Text>
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
                <View style={{ marginVertical: Spacing.lg, paddingHorizontal: Spacing.lg }}>
                  <Text style={[Typography.Heading3, { color: theme.text, marginBottom: Spacing.xs }]}>Facilități</Text>
                  <Text style={[Typography.Paragraph2, { color: theme.textSecondary }]}>Nu s-au putut găsi facilități.</Text>
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
            </>
          )}
        </View>
      </Animated.ScrollView>
    </View>
  );
}