import React from "react";
import { View, Text, ScrollView } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { Colors, ColorScheme, Spacing } from "@/constants/theme";
import { Typography } from "@/constants/typography";

import { WebContainer } from "@/components/ui/web-container";
import { Carousel } from "@/components/ui/carousel";
import { CAROUSEL_CARD_MARGIN } from "@/components/ui/carousel.shared";
import { NewsCard } from "@/components/ui/news-card";
import { getFormattedDate } from "@/utils/date";
import MOCK_DATA from "@/constants/mock-data.json";

export default function HomeScreen() {
  const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
  const theme = Colors[themeName];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const noutati = MOCK_DATA.events.filter(e => e.category === "Noutăți");
  const evenimente = MOCK_DATA.events.filter(e => e.category === "Evenimente");
  const facultati = MOCK_DATA.faculties;
  const facilitati = MOCK_DATA.facilities;

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
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
        {/* Banner full-bleed: ramane pe toata latimea, in afara canvas-ului scalat */}
        <View style={{ width: "100%", height: 285 }}>
          <Image
            source={require("@/assets/images/campus-stiintei.png")}
            style={{ width: "100%", height: "100%", position: "absolute" }}
            contentFit="cover"
          />

          <View style={{ flex: 1, paddingVertical: Spacing.lg, justifyContent: "flex-end" }}>
            <WebContainer>
              {/* paddingHorizontal Spacing.lg ca sa se alinieze cu titlurile caruselelor */}
              <View style={{ paddingHorizontal: Spacing.lg }}>
                <Text style={[Typography.Paragraph2, { color: ColorScheme.white }]}>
                  Astăzi, 27 mai
                </Text>
                <Text style={[Typography.Heading2, { color: ColorScheme.white }]}>
                  Descoperă
                </Text>
              </View>
            </WebContainer>
          </View>
        </View>

        <WebContainer style={{ paddingTop: Spacing.lg, paddingBottom: insets.bottom + Spacing.sm, flex: 1 }}>
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
