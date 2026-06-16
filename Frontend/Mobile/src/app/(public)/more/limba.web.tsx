import React, { useState } from "react";
import { 
  View, 
  Text, 
  Pressable, 
  Animated, 
  useColorScheme
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, Stack } from "expo-router";

import { Colors, Spacing, WebSidePadding } from "@/constants/theme";
import { Typography } from "@/constants/typography";
import { CategoryHeader } from "@/components/ui/display/category-header";
import { WebContainer } from "@/components/ui/layout/web-container";
import { settingsStore } from "@/utils/settings-store";

import CloseIcon from "@/assets/icons/svg/x.svg";

export default function LanguageScreen() {
  const systemColorScheme = useColorScheme();
  const themeName = (systemColorScheme ?? "light") as keyof typeof Colors;
  const theme = Colors[themeName];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [scrollY] = useState(() => new Animated.Value(0));

  // Read current selected language from settings store
  const currentLang = settingsStore.getLang();

  const languages = [
    { code: "ro", label: "Română" },
    { code: "en", label: "English" },
    { code: "es", label: "Español" },
    { code: "fr", label: "Français" },
    { code: "de", label: "Deutsch" },
    { code: "it", label: "Italiano" }
  ];

  const handleSelectLanguage = (code: string) => {
    settingsStore.setLang(code);
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
                Limbă aplicație
              </Text>
            </Animated.View>
          ),
        }}
      />

      <Animated.ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 140,
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
            <CategoryHeader title="Limbă" />

            <View style={{ gap: Spacing.md, marginTop: Spacing.md }}>
              <Text style={[Typography.Heading4, { color: theme.text }]}>
                Selectează limba
              </Text>

              <View style={{ gap: Spacing.sm, marginTop: Spacing.xs }}>
                {languages.map((l) => {
                  const isSelected = currentLang === l.code;
                  return (
                    <Pressable
                      key={l.code}
                      onPress={() => handleSelectLanguage(l.code)}
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
                        {l.label}
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
