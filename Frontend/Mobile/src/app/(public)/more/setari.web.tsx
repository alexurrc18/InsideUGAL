import { useColorScheme } from "@/hooks/use-color-scheme";
import React, { useState, useEffect } from "react";
import { View, Text, Pressable, Animated, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, Stack } from "expo-router";

import { Colors, Spacing, WebSidePadding } from "@/constants/theme";
import { useWebContentTop } from "@/hooks/use-web-content-top";
import { Typography } from "@/constants/typography";
import { CategoryHeader } from "@/components/ui/display/category-header";
import { WebContainer } from "@/components/ui/layout/web-container";
import { settingsStore } from "@/utils/settings-store";
import { useTranslation } from 'react-i18next';
import { LANGUAGES } from '@/constants/languages';

import BackIcon from "@/assets/icons/svg/chevron-left.svg";
import GlobeIcon from "@/assets/icons/svg/globe-europe.svg";

export default function SettingsScreen() {
  const systemColorScheme = useColorScheme();
  const themeName = (systemColorScheme ?? "light") as keyof typeof Colors;
  const theme = Colors[themeName];
  const insets = useSafeAreaInsets();
  const contentTop = useWebContentTop();
  const router = useRouter();

  const [scrollY] = useState(() => new Animated.Value(0));

  const { t, i18n } = useTranslation();

  // Local settings state driven by settingsStore
  const [selectedTheme, setSelectedTheme] = useState(() => settingsStore.getTheme());

  useEffect(() => {
    const unsubscribe = settingsStore.subscribe(() => {
      setSelectedTheme(settingsStore.getTheme());
    });
    return unsubscribe;
  }, []);
  
  const languages = LANGUAGES;

  const handleOpenWebsite = () => {
    Linking.openURL("https://www.ugal.ro").catch((err) =>
      console.error("Failed to open website", err)
    );
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
                {t('settings.title')}
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
            <CategoryHeader title={t('settings.title')} />

            <View style={{ gap: Spacing.xl, marginTop: Spacing.md }}>
              
              {/* SECȚIUNEA 1: ASPECT & LIMBĂ */}
              <View style={{ gap: Spacing.md }}>
                <Text style={[Typography.Heading4, { color: theme.text }]}>
                  {t('settings.appearanceLang')}
                </Text>
                
                <View style={{ gap: Spacing.lg, paddingVertical: Spacing.xs }}>
                  {/* Opțiune Temă */}
                  <View style={{ gap: Spacing.xs }}>
                    <Text style={[Typography.Paragraph2, { color: theme.text }]}>{t('settings.themeApp')}</Text>
                    
                    {/* Buton navigare temă - navighează la tema.tsx */}
                    <Pressable
                      onPress={() => router.push("/(public)/more/tema")}
                      style={({ pressed }) => ({
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        height: 56,
                        backgroundColor: theme.surface,
                        borderRadius: Spacing.md,
                        paddingHorizontal: Spacing.lg,
                        opacity: pressed ? 0.9 : 1,
                        marginTop: Spacing.xs
                      })}
                    >
                      <Text style={{ color: theme.text, fontFamily: "InstrumentSans-Medium", fontSize: 16 }}>
                        {t('settings.currentTheme')} <Text style={{ color: theme.primary, fontFamily: "InstrumentSans-Bold" }}>
                          {selectedTheme === "system" ? t('theme.system') : selectedTheme === "light" ? t('theme.light') : t('theme.dark')}
                        </Text>
                      </Text>
                      <BackIcon 
                        width={18} 
                        height={18} 
                        color={theme.textSecondary} 
                        style={{ transform: [{ rotate: "180deg" }] }} // Points right as chevron-right
                      />
                    </Pressable>
                  </View>

                  {/* Opțiune Limbă */}
                  <View style={{ gap: Spacing.xs }}>
                    <Text style={[Typography.Paragraph2, { color: theme.text }]}>{t('language.title')}</Text>

                    {/* Buton navigare limbă - navighează la limba.tsx */}
                    <Pressable
                      onPress={() => router.push("/(public)/more/limba")}
                      style={({ pressed }) => ({
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        height: 56,
                        backgroundColor: theme.surface,
                        borderRadius: Spacing.md,
                        paddingHorizontal: Spacing.lg,
                        opacity: pressed ? 0.9 : 1,
                        marginTop: Spacing.xs
                      })}
                    >
                      <Text style={{ color: theme.text, fontFamily: "InstrumentSans-Medium", fontSize: 16 }}>
                        {t('settings.currentLang')} <Text style={{ color: theme.primary, fontFamily: "InstrumentSans-Bold" }}>{languages.find((l) => l.code === i18n.language)?.label || i18n.language}</Text>
                      </Text>
                      <BackIcon 
                        width={18} 
                        height={18} 
                        color={theme.textSecondary} 
                        style={{ transform: [{ rotate: "180deg" }] }} // Points right as chevron-right
                      />
                    </Pressable>
                  </View>
                </View>
              </View>

              {/* SECȚIUNEA 2: DESPRE & ACȚIUNI */}
              <View style={{ gap: Spacing.md, marginTop: Spacing.md }}>
                <Text style={[Typography.Heading4, { color: theme.text }]}>
                  {t('settings.supportInfo')}
                </Text>

                <View style={{ gap: Spacing.md }}>
                  {/* Link Site */}
                  <Pressable 
                    onPress={handleOpenWebsite}
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      paddingVertical: Spacing.sm,
                      opacity: pressed ? 0.6 : 1
                    })}
                  >
                    <Text style={[Typography.Paragraph2, { color: theme.text }]}>{t('settings.visitWebsite')}</Text>
                    <GlobeIcon width={22} height={22} color={theme.textSecondary} />
                  </Pressable>
                </View>
              </View>

              {/* Subsol (App Version) */}
              <View style={{ alignItems: "center", marginTop: Spacing.md, gap: Spacing.xs, marginBottom: Spacing.xl }}>
                <Text style={[Typography.Small1, { color: theme.textSecondary }]}>
                  InsideUGAL v0.1.0
                </Text>
                <Text style={[Typography.Small2, { color: theme.textSecondary, textAlign: "center" }]}>
                  {t('settings.appSlogan')}
                </Text>
              </View>

            </View>
          </View>
        </WebContainer>
      </Animated.ScrollView>
    </View>
  );
}
