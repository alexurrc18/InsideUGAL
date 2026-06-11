import React, { useState } from "react";
import { View, Text, Linking, Pressable, Animated } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { Colors, Spacing, WebSidePadding } from "@/constants/theme";
import { Typography } from "@/constants/typography";
import { NewsCard } from "@/components/ui/news-card";
import { CategoryHeader } from "@/components/ui/category-header";
import BackIcon from "@/assets/icons/svg/chevron-left.svg";
import MOCK_DATA from "@/constants/mock-data.json";

export default function MoreCategoryScreen() {
  const { categoryId, title: categoryTitle } = useLocalSearchParams();
  const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
  const theme = Colors[themeName];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [scrollY] = useState(() => new Animated.Value(0));

  const filteredData = (MOCK_DATA as any).cityGuide.filter(
    (item: any) => item.categoryId === categoryId
  );

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
          paddingTop: insets.top + 80,
          paddingBottom: insets.bottom + Spacing.xxl
        }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        <View style={{ width: "100%", paddingHorizontal: WebSidePadding }}>
          <View style={{ marginBottom: Spacing.lg }}>
            <CategoryHeader 
              title={(categoryTitle as string) || "Ghid"}
            />
          </View>

          <View style={{ gap: Spacing.xxl, paddingHorizontal: Spacing.lg }}>
            {filteredData.map((item: any) => (
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

          {filteredData.length === 0 && (
            <Text style={[Typography.Paragraph1, { color: theme.text, textAlign: "center", marginTop: 40 }]}>
              Nu există elemente în această categorie.
            </Text>
          )}
        </View>
      </Animated.ScrollView>
    </View>
  );
}
