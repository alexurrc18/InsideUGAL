import { View, ScrollView } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Colors, Spacing } from "@/constants/theme";

import { WebContainer } from "@/components/ui/web-container";
import { Carousel } from "@/components/ui/carousel";
import { CAROUSEL_CARD_MARGIN } from "@/components/ui/carousel.shared";
import { NewsCard } from "@/components/ui/news-card";
import { HeroSlideshow, HERO_HEIGHT } from "@/components/ui/hero-slideshow";
import { HomeHighlights } from "@/components/ui/home-highlights";
import { NAVBAR_HEIGHT } from "@/components/ui/web-navbar";
import { getFormattedDate, parseRomanianDate } from "@/utils/date";
import { useWebScrollAware } from "@/contexts/web-scroll-context";
import MOCK_DATA from "@/constants/mock-data.json";

export default function HomeScreen() {
  const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
  const theme = Colors[themeName];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Navbar transparent pana trece de hero. Pragul = inaltimea hero-ului minus navbar.
  const scrollProps = useWebScrollAware(HERO_HEIGHT - NAVBAR_HEIGHT);

  const noutati = MOCK_DATA.events.filter(e => e.category === "Noutăți");
  const evenimente = MOCK_DATA.events.filter(e => e.category === "Evenimente");
  const facultati = MOCK_DATA.faculties;
  const facilitati = MOCK_DATA.facilities;

  // Ultimele 3 anunturi (Noutăți), cele mai recente primele, pentru hero.
  const heroItems = [...noutati]
    .sort((a, b) => parseRomanianDate(b.date).getTime() - parseRomanianDate(a.date).getTime())
    .slice(0, 3);

  // Sectiunea "Recomandate": un anunt mare (featured) + 3 compacte, fara duplicat.
  const featuredItem = evenimente[0] ?? noutati[0];
  const highlightItems = MOCK_DATA.events.filter((e) => e.id !== featuredItem?.id).slice(0, 3);

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

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} {...scrollProps}>
        {/* Hero slideshow full-bleed: ultimele 3 anunturi, auto-rotire + puncte. */}
        <HeroSlideshow slides={heroItems} onPressItem={handlePress} />

        {/* Sectiune intre hero si carusele: 3 carduri compacte + 1 card mare. */}
        <HomeHighlights featured={featuredItem} items={highlightItems} onPressItem={handlePress} />

        <WebContainer style={{ paddingTop: Spacing.xl3, paddingBottom: insets.bottom + Spacing.sm, flex: 1 }}>
          <Carousel
            title="Noutăți"
            data={noutati}
            keyExtractor={(item) => item.id}
            viewAllHref="/(public)/acasa/categorie?title=Noutăți"
            renderItem={({ item, index }) => (
              <NewsCard
                title={item.title}
                date={getFormattedDate(item.date)}
                author={item.author}
                image={item.image}
                marginRight={index === noutati.length - 1 ? 0 : CAROUSEL_CARD_MARGIN}
                onPress={() => handlePress(item)}
              />
            )}
          />
          <Carousel
            title="Evenimente"
            data={evenimente}
            keyExtractor={(item) => item.id}
            viewAllHref="/(public)/acasa/categorie?title=Evenimente"
            renderItem={({ item, index }) => (
              <NewsCard
                title={item.title}
                date={getFormattedDate(item.date_start || item.date)}
                author={item.author}
                image={item.image}
                marginRight={index === evenimente.length - 1 ? 0 : CAROUSEL_CARD_MARGIN}
                onPress={() => handlePress(item)}
              />
            )}
          />
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
        </WebContainer>
      </ScrollView>
    </View>
  );
}
