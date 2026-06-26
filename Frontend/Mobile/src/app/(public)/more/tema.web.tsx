import { useColorScheme } from "@/hooks/use-color-scheme";
import React, { useState } from "react";
import { View, Text, Pressable, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, Stack } from "expo-router";

import { Colors, Spacing, WebSidePadding } from "@/constants/theme";
import { useWebContentTop } from "@/hooks/use-web-content-top";
import { Typography } from "@/constants/typography";
import { CategoryHeader } from "@/components/ui/display/category-header";
import { WebContainer } from "@/components/ui/layout/web-container";
import { settingsStore } from "@/utils/settings-store";

import CloseIcon from "@/assets/icons/svg/x.svg";

export default function ThemeScreen() {
  const systemColorScheme = useColorScheme();
  const themeName = (systemColorScheme ?? "light") as keyof typeof Colors;
  const theme = Colors[themeName];
  const insets = useSafeAreaInsets();
  const contentTop = useWebContentTop();
  const router = useRouter();

  const [scrollY] = useState(() => new Animated.Value(0));

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

  const headerTitleOpacity = scrollY.interpolate({
    inputRange: [80, 120],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen
        options={{
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
              <CloseIcon width={24} height={24} color={theme.text} />
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
                Temă aplicație
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
          <View style={{ width: "100%", paddingHorizontal: WebSidePadding }}>
            <CategoryHeader title="Temă" />

            <View style={{ gap: Spacing.md, marginTop: Spacing.md }}>
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
          </View>
        </WebContainer>
      </Animated.ScrollView>
    </View>
  );
}
