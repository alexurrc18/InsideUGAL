import React from "react";
import { View, Text, Pressable } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Colors, Spacing } from "@/constants/theme";
import { CategoryHeader } from "@/components/ui/category-header";
import { Typography } from "@/constants/typography";
import { useT } from "@/i18n/use-t";

export default function MoreScreen() {
  const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
  const theme = Colors[themeName];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useT();

  return (
    <View style={{ flex: 1, backgroundColor: theme.background, paddingTop: insets.top + Spacing.xxl }}>
      <CategoryHeader title={t("more.title")} />

      <View style={{ paddingHorizontal: Spacing.lg, marginTop: Spacing.lg }}>
        <Pressable
          onPress={() => router.push("/(auth)")}
          style={({ pressed }) => ({
            opacity: pressed ? 0.6 : 1,
            paddingVertical: Spacing.sm
          })}
        >
          <Text style={[Typography.Paragraph1, { color: theme.text }]}>
            {t("auth.login")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
