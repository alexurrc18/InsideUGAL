import { useColorScheme } from "@/hooks/use-color-scheme";
import React, { useState, useEffect } from "react";
import { View, Text, Switch, Pressable, Animated, Linking, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, Stack } from "expo-router";
import * as WebBrowser from "expo-web-browser";

import { Colors, Spacing } from "@/constants/theme";
import { Typography } from "@/constants/typography";
import { CategoryHeader } from "@/components/ui/display/category-header";
import { settingsStore } from "@/utils/settings-store";

import BackIcon from "@/assets/icons/svg/chevron-left.svg";
import GlobeIcon from "@/assets/icons/svg/globe-europe.svg";

export default function SettingsScreen() {
  const systemColorScheme = useColorScheme();
  const themeName = (systemColorScheme ?? "light") as keyof typeof Colors;
  const theme = Colors[themeName];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [scrollY] = useState(() => new Animated.Value(0));

  // Local settings states driven by settingsStore
  const [selectedTheme, setSelectedTheme] = useState(() => settingsStore.getTheme());
  const [selectedLang, setSelectedLang] = useState(() => settingsStore.getLang());

  useEffect(() => {
    const unsubscribe = settingsStore.subscribe(() => {
      setSelectedTheme(settingsStore.getTheme());
      setSelectedLang(settingsStore.getLang());
    });
    return unsubscribe;
  }, []);
  
  const [notifyStaff, setNotifyStaff] = useState(true);
  const [notifyStiri, setNotifyStiri] = useState(true);

  const languages = [
    { code: "ro", label: "Română" },
    { code: "en", label: "English" },
    { code: "es", label: "Español" },
    { code: "fr", label: "Français" },
    { code: "de", label: "Deutsch" },
    { code: "it", label: "Italiano" }
  ];

  const handleOpenWebsite = async () => {
    try {
      await WebBrowser.openBrowserAsync("https://www.ugal.ro");
    } catch (error) {
      console.error("Failed to open website", error);
      Linking.openURL("https://www.ugal.ro").catch((err) =>
        console.error("Failed to open URL fallback", err)
      );
    }
  };

  const headerTitleOpacity = scrollY.interpolate({
    inputRange: [50, 90],
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
                Setări
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
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        <CategoryHeader title="Setări" />

        <View style={{ paddingHorizontal: Spacing.lg, gap: Spacing.xl, marginTop: Spacing.md }}>
          
          {/* SECȚIUNEA 1: ASPECT & LIMBĂ */}
          <View style={{ gap: Spacing.md }}>
            <Text style={[Typography.Heading4, { color: theme.text }]}>
              Aspect & Limbă
            </Text>
            
            <View style={{ gap: Spacing.lg, paddingVertical: Spacing.xs }}>
              {/* Opțiune Temă */}
              <View style={{ gap: Spacing.xs }}>
                <Text style={[Typography.Paragraph2, { color: theme.text }]}>Temă aplicație</Text>
                
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
                    Temă curentă: <Text style={{ color: theme.primary, fontFamily: "InstrumentSans-Bold" }}>
                      {selectedTheme === "system" ? "Sistem" : selectedTheme === "light" ? "Luminos" : "Întunecat"}
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
                <Text style={[Typography.Paragraph2, { color: theme.text }]}>Limbă aplicație</Text>

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
                    Limbă curentă: <Text style={{ color: theme.primary, fontFamily: "InstrumentSans-Bold" }}>{languages.find((l) => l.code === selectedLang)?.label || "Română"}</Text>
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

          {/* SECȚIUNEA 2: NOTIFICĂRI */}
          <View style={{ gap: Spacing.md, marginTop: Spacing.md }}>
            <Text style={[Typography.Heading4, { color: theme.text }]}>
              Notificări
            </Text>
            
            <View style={{ gap: Spacing.md }}>
              {/* Notificare 1 (Alerte Campus) */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: Spacing.xs }}>
                <View style={{ flex: 1, marginRight: Spacing.md }}>
                  <Text style={[Typography.Paragraph2, { color: theme.text }]}>Alerte Campus</Text>
                </View>
                <Switch 
                  value={notifyStaff} 
                  onValueChange={setNotifyStaff}
                  trackColor={{ false: theme.border, true: theme.primary }}
                  thumbColor={Platform.OS === "android" ? theme.surface : undefined}
                />
              </View>

              {/* Notificare 2 (Știri & Anunțuri) */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: Spacing.xs }}>
                <View style={{ flex: 1, marginRight: Spacing.md }}>
                  <Text style={[Typography.Paragraph2, { color: theme.text }]}>Știri & Anunțuri</Text>
                </View>
                <Switch 
                  value={notifyStiri} 
                  onValueChange={setNotifyStiri}
                  trackColor={{ false: theme.border, true: theme.primary }}
                  thumbColor={Platform.OS === "android" ? theme.surface : undefined}
                />
              </View>
            </View>
          </View>

          {/* SECȚIUNEA 3: DESPRE & ACȚIUNI */}
          <View style={{ gap: Spacing.md, marginTop: Spacing.md }}>
            <Text style={[Typography.Heading4, { color: theme.text }]}>
              Asistență & Info
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
                <Text style={[Typography.Paragraph2, { color: theme.text }]}>Vizitează Website UGAL</Text>
                <GlobeIcon width={22} height={22} color={theme.textSecondary} />
              </Pressable>
            </View>
          </View>

          {/* Subsol (App Version) */}
          <View style={{ alignItems: "center", marginTop: Spacing.xl, gap: Spacing.xs }}>
            <Text style={[Typography.Small1, { color: theme.textSecondary }]}>
              InsideUGAL v0.1.0
            </Text>
            <Text style={[Typography.Small2, { color: theme.textSecondary, textAlign: "center" }]}>
              Creat pentru studenții Universității „Dunărea de Jos” din Galați
            </Text>
          </View>

        </View>
      </Animated.ScrollView>
    </View>
  );
}
