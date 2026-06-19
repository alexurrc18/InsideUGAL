import React from "react";
import { View, Text, useColorScheme } from "react-native";
import { Colors, Spacing } from "@/constants/theme";
import { Typography } from "@/constants/typography";
import AlertIcon from "@/assets/icons/svg/alert-octagon.svg";

interface ErrorStateProps {
  message?: string;
  title?: string;
}

export function ErrorState({ title, message }: ErrorStateProps) {
  const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
  const theme = Colors[themeName];

  return (
    <View style={{ flex: 1, backgroundColor: theme.background, justifyContent: "center", alignItems: "center", padding: Spacing.xxl }}>
      <AlertIcon width={64} height={64} color={theme.secondary} style={{ marginBottom: Spacing.lg }} />
      <Text style={[Typography.Heading3, { color: theme.text, textAlign: "center", marginBottom: Spacing.md }]}>
        {title || "Ups! A intervenit o eroare..."}
      </Text>
      <Text style={[Typography.Paragraph1, { color: theme.textSecondary, textAlign: "center", lineHeight: 22 }]}>
        {message || "Se pare că serverul a luat restanță la rețele de calculatoare. Ne pregătim de mărire, așa că mergem să mai studiem puțin. Te rugăm să revii mai târziu!"}
      </Text>
    </View>
  );
}
