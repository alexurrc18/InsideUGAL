import React from "react";
import { View, Text, ScrollView, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { Colors } from "@/constants/theme";
import { Typography } from "@/constants/typography";

export default function CategoryScreen() {
  const { title } = useLocalSearchParams();
  const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
  const theme = Colors[themeName];
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ 
          padding: 16, 
          paddingTop: insets.top + 50 
        }}
      >
        <Text style={[Typography.Heading1, { color: theme.text, marginBottom: 16 }]}>
          {title || "Categorie"}
        </Text>

      </ScrollView>
    </View>
  );
}