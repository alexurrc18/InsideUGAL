import React, { useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, Stack } from "expo-router";
import { Colors, Spacing } from "@/constants/theme";
import { WebContainer } from "@/components/ui/layout/web-container";
import { CategoryHeader } from "@/components/ui/display/category-header";
import { useWebContentTop } from "@/hooks/use-web-content-top";
import { Typography } from "@/constants/typography";
import api from "@/services/api";
import { useTranslation } from 'react-i18next';

// Import local SVGs
import BusIcon from "@/assets/icons/svg/bus.svg";
import DinoIcon from "@/assets/icons/svg/dino.svg";
import FilmIcon from "@/assets/icons/svg/film-roll-alt.svg";
import TreeIcon from "@/assets/icons/svg/tree-alt.svg";
import PhoneIcon from "@/assets/icons/svg/phone.svg";
import GlobeIcon from "@/assets/icons/svg/globe-europe.svg";

export default function MoreScreen() {
  const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
  const theme = Colors[themeName];
  const insets = useSafeAreaInsets();
  const contentTop = useWebContentTop();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    api.get('/city-guide/categories', { params: { lang: i18n.language } })
      .then(res => {
        const data = res.data;
        if (data && Array.isArray(data)) {
          setCategories(data);
        } else if (data && Array.isArray(data.items)) {
          setCategories(data.items);
        } else {
          setCategories([]);
        }
      })
      .catch(() => {
        setCategories([]);
      });
  }, []);

  const renderIcon = (iconName: string, color: string) => {
    switch (iconName) {
      case "bus":
        return <BusIcon width={44} height={44} color={color} />;
      case "dino":
      case "museum":
        return <DinoIcon width={44} height={44} color={color} />;
      case "film-roll-alt":
      case "theater":
        return <FilmIcon width={44} height={44} color={color} />;
      case "tree-alt":
      case "park":
        return <TreeIcon width={44} height={44} color={color} />;
      case "phone":
        return <PhoneIcon width={44} height={44} color={color} />;
      case "globe":
        return <GlobeIcon width={44} height={44} color={color} />;
      default:
        return null;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: contentTop,
          paddingBottom: insets.bottom + Spacing.xxl,
        }}
      >
        <WebContainer>
          <CategoryHeader title={t('more.title')} />



          {/* Section Title */}
          <View style={{ paddingHorizontal: Spacing.lg, marginTop: Spacing.xl3, marginBottom: Spacing.sm }}>
            <Text style={[Typography.Heading4, { color: theme.text }]}>{t('more.visitGalati')}</Text>
          </View>

          {/* Categories Grid - 3 items per row */}
          <View 
            style={{ 
              flexDirection: "row", 
              flexWrap: "wrap", 
              paddingHorizontal: Spacing.lg, 
              gap: Spacing.sm,
              justifyContent: "flex-start"
            }}
          >
            {categories.map((cat) => {
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => router.push({
                    pathname: "/(public)/more/categorie",
                    params: { categoryId: cat.id, title: cat.title }
                  })}
                  style={({ pressed }) => ({
                    width: "18%",
                    paddingVertical: Spacing.sm,
                    alignItems: "center",
                    opacity: pressed ? 0.6 : 1,
                    gap: Spacing.xs,
                  })}
                >
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      justifyContent: "center",
                      alignItems: "center",
                      marginBottom: 2
                    }}
                  >
                    {renderIcon(cat.icon_name || cat.iconName || "", theme.secondary)}
                  </View>

                  <Text 
                    style={{ 
                      fontSize: 14,
                      fontFamily: "InstrumentSans-Medium",
                      fontWeight: "500",
                      color: theme.text,
                      textAlign: "center"
                    }} 
                    numberOfLines={2}
                  >
                    {cat.title}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </WebContainer>
      </ScrollView>
    </View>
  );
}
