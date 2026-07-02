import { useColorScheme } from "@/hooks/use-color-scheme";
import React, { useState, useEffect } from "react";
import { View, Text, Linking, Platform, Pressable } from "react-native";
import Animated, { useSharedValue, useAnimatedScrollHandler, useAnimatedStyle, interpolate, Extrapolation } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { Colors, Spacing } from "@/constants/theme";
import { Typography } from "@/constants/typography";
import { NewsCard } from "@/components/ui/display/news-card";
import { CategoryHeader } from "@/components/ui/display/category-header";
import * as WebBrowser from "expo-web-browser";
import BackIcon from "@/assets/icons/svg/chevron-left.svg";
import api from "@/services/api";
import { useTranslation } from 'react-i18next';

export default function MoreCategoryScreen() {
  const { categoryId, title: categoryTitle } = useLocalSearchParams();
  const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
  const theme = Colors[themeName];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const { t, i18n } = useTranslation();

  useEffect(() => {
    if (!categoryId) return;
    api.get('/city-guide', { params: { category_id: categoryId, lang: i18n.language } })
      .then(res => {
        const data = res.data;
        if (data && Array.isArray(data)) {
          setItems(data);
        } else if (data && Array.isArray(data.items)) {
          setItems(data.items);
        } else {
          setItems([]);
        }
      })
      .catch(() => {
        setItems([]);
      });
  }, [categoryId, i18n.language]);

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });
  const headerTitleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [50, 90], [0, 1], Extrapolation.CLAMP),
  }));

  const handlePress = async (item: any) => {
    if (item.website) {
      try {
        await WebBrowser.openBrowserAsync(item.website);
      } catch (error) {
        console.error("Failed to open website", error);
        Linking.openURL(item.website).catch((err) =>
          console.error("Failed to open URL fallback", err)
        );
      }
    } else if (item.address) {
      const encodedAddress = encodeURIComponent(item.address);
      const url = Platform.select({
        ios: `maps://0,0?q=${encodedAddress}`,
        android: `geo:0,0?q=${encodedAddress}`,
        default: `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`
      });
      Linking.openURL(url).catch((err) =>
        console.error("Failed to open map URL", err)
      );
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen
        options={{
          headerShown: true,
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
            <Animated.View style={headerTitleStyle}>
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
                {(categoryTitle as string) || t('more.guideFallback')}
              </Text>
            </Animated.View>
          ),
        }}
      />

      <Animated.ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ 
          paddingTop: Spacing.md,
          paddingBottom: insets.bottom + Spacing.xxl
        }}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        <View style={{ marginBottom: Spacing.lg }}>
          <CategoryHeader 
            title={(categoryTitle as string) || t('more.guideFallback')}
          />
        </View>

        <View style={{ gap: Spacing.xxl, paddingHorizontal: Spacing.lg }}>
          {items.map((item: any) => (
            <NewsCard
              key={item.id}
              variant="list"
              title={item.title}
              author={item.address}
              image={item.image_url || item.image}
              onPress={() => handlePress(item)}
            />
          ))}
        </View>

        {items.length === 0 && (
          <Text style={[Typography.Paragraph1, { color: theme.text, textAlign: "center", marginTop: 40 }]}>
            {t('category.empty')}
          </Text>
        )}

      </Animated.ScrollView>
    </View>
  );
}
