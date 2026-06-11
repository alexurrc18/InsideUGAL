import React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Colors, Spacing } from "@/constants/theme";
import { WebContainer } from "@/components/ui/web-container";
import { CategoryHeader } from "@/components/ui/category-header";
import { Typography } from "@/constants/typography";
import MockData from "@/constants/mock-data.json";

// Import local SVGs
import BusIcon from "@/assets/icons/svg/bus.svg";
import DinoIcon from "@/assets/icons/svg/dino.svg";
import FilmIcon from "@/assets/icons/svg/film-roll-alt.svg";
import TreeIcon from "@/assets/icons/svg/tree-alt.svg";
import PhoneIcon from "@/assets/icons/svg/phone.svg";
import GlobeIcon from "@/assets/icons/svg/globe-europe.svg";
import UserIcon from "@/assets/icons/svg/user.svg";

export default function MoreScreen() {
  const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
  const theme = Colors[themeName];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const renderIcon = (iconName: string, color: string) => {
    switch (iconName) {
      case "bus":
        return <BusIcon width={24} height={24} color={color} />;
      case "dino":
        return <DinoIcon width={24} height={24} color={color} />;
      case "film-roll-alt":
        return <FilmIcon width={24} height={24} color={color} />;
      case "tree-alt":
        return <TreeIcon width={24} height={24} color={color} />;
      case "phone":
        return <PhoneIcon width={24} height={24} color={color} />;
      case "globe":
        return <GlobeIcon width={24} height={24} color={color} />;
      default:
        return null;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 140,
          paddingBottom: insets.bottom + Spacing.xxl,
        }}
      >
        <WebContainer>
          <CategoryHeader title="Mai multe" />

          {/* Profile & Settings Grid */}
          <View 
            style={{ 
              flexDirection: "row", 
              flexWrap: "wrap", 
              paddingHorizontal: Spacing.lg, 
              gap: Spacing.sm,
              justifyContent: "flex-start",
              marginTop: Spacing.xs,
              marginBottom: Spacing.sm
            }}
          >
            {/* Item: Profil */}
            <Pressable
              onPress={() => router.push("/(auth)")}
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
                  width: 32,
                  height: 32,
                  justifyContent: "center", 
                  alignItems: "center",
                  marginBottom: 2
                }}
              >
                <UserIcon width={24} height={24} color={theme.primary} />
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
                Profil
              </Text>
            </Pressable>

          </View>

          {/* Section Title */}
          <View style={{ paddingHorizontal: Spacing.lg, marginTop: Spacing.sm, marginBottom: Spacing.sm }}>
            <Text style={[Typography.Heading4, { color: theme.text }]}>Vizitează Galați</Text>
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
            {MockData.cityGuideCategories.map((cat) => {
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
                      width: 32,
                      height: 32, 
                      justifyContent: "center", 
                      alignItems: "center",
                      marginBottom: 2
                    }}
                  >
                    {renderIcon(cat.iconName, theme.secondary)}
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
