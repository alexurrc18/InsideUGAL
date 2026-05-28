import React from "react";
import { View, Text, ScrollView, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { Colors, ColorScheme } from "@/constants/theme";
import { Typography } from "@/constants/typography";

import { Carousel, CAROUSEL_CARD_WIDTH, CAROUSEL_CARD_MARGIN } from "@/components/ui/carousel";
import { NewsCard } from "@/components/ui/news-card";

const MOCK_EVENTS = [
  { id: "1", title: "Titlu", date: "vineri, 21 mai", author: "Autor", image: require("@/assets/images/placeholders/1920x1080.png") },
  { id: "2", title: "Titlu", date: "vineri, 21 mai", author: "Autor", image: require("@/assets/images/placeholders/1920x1080.png") },
  { id: "3", title: "Titlu", date: "vineri, 21 mai", author: "Autor", image: require("@/assets/images/placeholders/1920x1080.png") },
];

export default function HomeScreen() {
  const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
  const theme = Colors[themeName];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView style={{ flex: 1, gap: 16 }} contentContainerStyle={{ flexGrow: 1 }}>
        <View style={{ width: "100%", height: 285 }}>
          <Image
            source={require("@/assets/images/campus-stiintei.png")}
            style={{ width: "100%", height: "100%", position: "absolute" }}
            contentFit="cover"
          />

          <View style={{ flex: 1, padding: 16, justifyContent: "flex-end" }}>
            <Text style={[Typography.Paragraph2, { color: ColorScheme.white }]}>
              Astăzi, 27 mai
            </Text>
            <Text style={[Typography.Heading2, { color: ColorScheme.white }]}>
              Descoperă
            </Text>
          </View>
        </View>

        <View style={{paddingBottom: insets.bottom+5, flex: 1}}>
          <Carousel
            title="Noutăți"
            data={MOCK_EVENTS}
            keyExtractor={(item) => item.id}
            viewAllHref="/(public)/acasa/categorie?title=Noutăți"
            renderItem={({ item, index }) => (
              <NewsCard
                title={item.title}
                date={item.date}
                author={item.author}
                image={item.image}
                width={CAROUSEL_CARD_WIDTH}
                height={CAROUSEL_CARD_WIDTH / (16 / 10)}
                marginRight={index === MOCK_EVENTS.length - 1 ? 0 : CAROUSEL_CARD_MARGIN}
              />
            )}
          />
          <Carousel
            title="Evenimente"
            data={MOCK_EVENTS}
            keyExtractor={(item) => item.id}
            viewAllHref="/(public)/acasa/categorie?title=Evenimente"
            renderItem={({ item, index }) => (
              <NewsCard
                title={item.title}
                date={item.date}
                author={item.author}
                image={item.image}
                width={CAROUSEL_CARD_WIDTH}
                height={CAROUSEL_CARD_WIDTH / (16 / 10)}
                marginRight={index === MOCK_EVENTS.length - 1 ? 0 : CAROUSEL_CARD_MARGIN}
              />
            )}
          />
          <Carousel
            title="Facultăți"
            data={MOCK_EVENTS}
            keyExtractor={(item) => item.id}
            viewAllHref="/(public)/acasa/categorie?title=Facultăți"
            renderItem={({ item, index }) => (
              <NewsCard
                title={item.title}
                date={item.date}
                author={item.author}
                image={item.image}
                width={CAROUSEL_CARD_WIDTH}
                height={CAROUSEL_CARD_WIDTH / (16 / 10)}
                marginRight={index === MOCK_EVENTS.length - 1 ? 0 : CAROUSEL_CARD_MARGIN}
              />
            )}
          />
        </View>
      </ScrollView>
    </View>
  );
}