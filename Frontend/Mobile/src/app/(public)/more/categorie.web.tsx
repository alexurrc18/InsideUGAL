import React, { useState, useEffect } from "react";
import { View, Text, Linking, Pressable, Animated } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { Colors, Spacing } from "@/constants/theme";
import { Typography } from "@/constants/typography";
import { NewsCard } from "@/components/ui/display/news-card";
import { CategoryHeader } from "@/components/ui/display/category-header";
import { WebContainer } from "@/components/ui/layout/web-container";
import { useWebContentTop } from "@/hooks/use-web-content-top";
import BackIcon from "@/assets/icons/svg/chevron-left.svg";
import api from "@/services/api";

export default function MoreCategoryScreen() {
  const { categoryId, title: categoryTitle } = useLocalSearchParams();
  const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
  const theme = Colors[themeName];
  const insets = useSafeAreaInsets();
  const contentTop = useWebContentTop();
  const router = useRouter();

  const [scrollY] = useState(() => new Animated.Value(0));
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (!categoryId) return;
    api.get('/city-guide', { params: { category_id: categoryId } })
      .then(res => setItems(res.data))
      .catch(() => {});
  }, [categoryId]);

  const handlePress = (item: any) => {
    if (item.website) {
      Linking.openURL(item.website).catch((err) =>
        console.error("Failed to open website", err)
      );
    } else if (item.address) {
      const encodedAddress = encodeURIComponent(item.address);
      const url = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
      Linking.openURL(url).catch((err) =>
        console.error("Failed to open map website", err)
      );
    }
  };

  const headerTitleOpacity = scrollY.interpolate({
    inputRange: [80, 120],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen
        options={{
          // Pe web nu aratam header-ul de Stack: WebNavbar-ul (overlay) il acopera
          // oricum, deci era doar spatiu mort care impingea continutul mai jos decat
          // pe sesizari/harta. Asa top-ul se aliniaza cu celelalte pagini.
          headerShown: false,
          headerShadowVisible: false,
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
            <Animated.View style={{ opacity: headerTitleOpacity }}>
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
                {(categoryTitle as string) || "Ghid"}
              </Text>
            </Animated.View>
          ),
        }}
      />

      <Animated.ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{
          paddingTop: contentTop,
          paddingBottom: insets.bottom + Spacing.xxl
        }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        <WebContainer>
          <View style={{ marginBottom: Spacing.lg }}>
            <CategoryHeader
              title={(categoryTitle as string) || "Ghid"}
            />
          </View>

          <View style={{ gap: Spacing.xxl, paddingHorizontal: Spacing.lg }}>
            {items.map((item: any) => (
              <NewsCard
                key={item.id}
                variant="list"
                title={item.title}
                author={item.address}
                image={item.image}
                onPress={() => handlePress(item)}
              />
            ))}
          </View>

          {items.length === 0 && (
            <Text style={[Typography.Paragraph1, { color: theme.text, textAlign: "center", marginTop: 40 }]}>
              Nu există elemente în această categorie.
            </Text>
          )}
        </WebContainer>
      </Animated.ScrollView>
    </View>
  );
}
