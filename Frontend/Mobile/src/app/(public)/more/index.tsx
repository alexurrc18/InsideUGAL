import React from "react";
import { View, Text, useColorScheme, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Colors, Spacing } from "@/constants/theme";
import { CategoryHeader } from "@/components/ui/display/category-header";
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
import SettingsIcon from "@/assets/icons/svg/cog.svg";

export default function MoreScreen() {
  const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
  const theme = Colors[themeName];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const renderIcon = (iconName: string, color: string) => {
    switch (iconName) {
      case "bus":
        return <BusIcon width={44} height={44} color={color} />;
      case "dino":
        return <DinoIcon width={44} height={44} color={color} />;
      case "film-roll-alt":
        return <FilmIcon width={44} height={44} color={color} />;
      case "tree-alt":
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
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingBottom: insets.bottom + Spacing.xxl,
        }}
      >

        {/* Profile & Settings Grid */}
        <View 
          style={{ 
            flexDirection: "row", 
            flexWrap: "wrap", 
            paddingHorizontal: Spacing.lg, 
            gap: Spacing.md,
            justifyContent: "flex-start",
            marginTop: Spacing.md,
            marginBottom: Spacing.xl
          }}
        >
          {/* Item: Setări */}
          <Pressable
            onPress={() => router.push({ pathname: "/(public)/more/setari" })}
            style={({ pressed }) => ({
              width: "30.5%",
              aspectRatio: 0.85,
              padding: Spacing.sm,
              justifyContent: "center",
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
              <SettingsIcon width={44} height={44} color={theme.primary} />
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
              Setări
            </Text>
          </Pressable>
        </View>

        {/* Section Title */}
        <View style={{ paddingHorizontal: Spacing.lg, marginTop: Spacing.xl, marginBottom: Spacing.md }}>
          <Text style={[Typography.Heading4, { color: theme.text }]}>Vizitează Galați</Text>
        </View>

        {/* Categories Grid - 3 items per row */}
        <View 
          style={{ 
            flexDirection: "row", 
            flexWrap: "wrap", 
            paddingHorizontal: Spacing.lg, 
            gap: Spacing.md,
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
                  width: "30.5%", // Calculates to approximately 3 columns with gap
                  aspectRatio: 0.85,
                  padding: Spacing.sm,
                  justifyContent: "center",
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
      </ScrollView>
    </View>
  );
}
