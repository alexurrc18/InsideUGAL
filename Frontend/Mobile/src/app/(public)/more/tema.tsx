import { useColorScheme } from "@/hooks/use-color-scheme";
import React from "react";
import { View, Text, Pressable } from "react-native";
import Animated, { useSharedValue, useAnimatedScrollHandler, useAnimatedStyle, interpolate, Extrapolation } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, Stack } from "expo-router";

import { Colors, Spacing } from "@/constants/theme";
import { Typography } from "@/constants/typography";
import { CategoryHeader } from "@/components/ui/display/category-header";
import { settingsStore } from "@/utils/settings-store";

import CloseIcon from "@/assets/icons/svg/x.svg";

export default function ThemeScreen() {
  const systemColorScheme = useColorScheme();
  const themeName = (systemColorScheme ?? "light") as keyof typeof Colors;
  const theme = Colors[themeName];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });
  const headerTitleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [50, 90], [0, 1], Extrapolation.CLAMP),
  }));

  // Read current selected theme from settings store
  const currentTheme = settingsStore.getTheme();

  const themes = [
    { code: "system", label: "Sistem" },
    { code: "light", label: "Luminos" },
    { code: "dark", label: "Întunecat" }
  ];

  const handleSelectTheme = (code: string) => {
    settingsStore.setTheme(code as any);
    router.back();
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
              <CloseIcon width={24} height={24} color={theme.text} />
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
                Temă aplicație
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
        <CategoryHeader title="Temă" />

        <View style={{ paddingHorizontal: Spacing.lg, gap: Spacing.md, marginTop: Spacing.md }}>
          <Text style={[Typography.Heading4, { color: theme.text }]}>
            Selectează tema
          </Text>

          <View style={{ gap: Spacing.sm, marginTop: Spacing.xs }}>
            {themes.map((t) => {
              const isSelected = currentTheme === t.code;
              return (
                <Pressable
                  key={t.code}
                  onPress={() => handleSelectTheme(t.code)}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingVertical: Spacing.md,
                    opacity: pressed ? 0.6 : 1
                  })}
                >
                  <Text
                    style={{
                      color: isSelected ? theme.primary : theme.text,
                      fontFamily: isSelected ? "InstrumentSans-Bold" : "InstrumentSans-Medium",
                      fontSize: 18
                    }}
                  >
                    {t.label}
                  </Text>
                  {isSelected && (
                    <Text
                      style={{
                        color: theme.primary,
                        fontFamily: "InstrumentSans-Bold",
                        fontSize: 16
                      }}
                    >
                      (Selectat)
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      </Animated.ScrollView>
    </View>
  );
}
