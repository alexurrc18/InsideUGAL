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
import { useTranslation } from 'react-i18next';

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

  const { t } = useTranslation();

  // Read current selected theme from settings store
  const currentTheme = settingsStore.getTheme();

  const themes = [
    { code: "system", label: t('theme.system') },
    { code: "light", label: t('theme.light') },
    { code: "dark", label: t('theme.dark') },
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
                {t('theme.title')}
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
        <CategoryHeader title={t('theme.header')} />

        <View style={{ paddingHorizontal: Spacing.lg, gap: Spacing.md, marginTop: Spacing.md }}>
          <Text style={[Typography.Heading4, { color: theme.text }]}>
            {t('theme.select')}
          </Text>

          <View style={{ gap: Spacing.sm, marginTop: Spacing.xs }}>
            {themes.map((themeItem) => {
              const isSelected = currentTheme === themeItem.code;
              return (
                <Pressable
                  key={themeItem.code}
                  onPress={() => handleSelectTheme(themeItem.code)}
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
                    {themeItem.label}
                  </Text>
                  {isSelected && (
                    <Text
                      style={{
                        color: theme.primary,
                        fontFamily: "InstrumentSans-Bold",
                        fontSize: 16
                      }}
                    >
                      {t('language.selected')}
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
