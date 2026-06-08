import React from "react";
import { View, Text, Pressable } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Colors, Spacing } from "@/constants/theme";
import { CategoryHeader } from "@/components/ui/category-header";
import { Typography } from "@/constants/typography";

export default function MoreScreen() {
  const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
  const theme = Colors[themeName];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: theme.background, paddingTop: insets.top + Spacing.xxl }}>
      <CategoryHeader title="Mai multe" />

      <View style={{ paddingHorizontal: Spacing.lg, marginTop: Spacing.lg }}>
        <Pressable
          onPress={() => router.push("/(auth)")}
          style={({ pressed }) => ({
            opacity: pressed ? 0.6 : 1,
            paddingVertical: Spacing.sm
          })}
        >
          <Text style={[Typography.Paragraph1, { color: theme.text }]}>
            Autentificare
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
