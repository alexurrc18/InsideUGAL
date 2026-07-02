import { useColorScheme } from "@/hooks/use-color-scheme";
import React from "react";
import { View, Text, Pressable, StyleProp, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Spacing } from "@/constants/theme";
import { Typography } from "@/constants/typography";
import AlertIcon from "@/assets/icons/svg/alert-octagon.svg";
import { useTranslation } from "react-i18next";

interface ErrorStateProps {
  message?: string;
  title?: string;
  onRetry?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function ErrorState({ title, message, onRetry, style }: ErrorStateProps) {
  const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
  const theme = Colors[themeName];
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  return (
    <View style={[{ 
      flex: 1, 
      backgroundColor: theme.background, 
      justifyContent: "center", 
      alignItems: "center", 
      paddingHorizontal: Spacing.xxl,
      paddingTop: insets.top,
      paddingBottom: insets.bottom
    }, style]}>
      <AlertIcon width={64} height={64} color={theme.secondary} style={{ marginBottom: Spacing.lg }} />
      <Text style={[Typography.Heading3, { color: theme.text, textAlign: "center", marginBottom: Spacing.md }]}>
        {title || t('common.errorTitle')}
      </Text>
      <Text style={[Typography.Paragraph1, { color: theme.textSecondary, textAlign: "center", lineHeight: 22 }]}>
        {message || t('common.connectionError')}
      </Text>
      {onRetry && (
        <Pressable 
          onPress={onRetry} 
          style={({ pressed }) => [
            {
              backgroundColor: theme.primary,
              paddingHorizontal: Spacing.xl,
              paddingVertical: Spacing.md,
              borderRadius: Spacing.md,
              marginTop: Spacing.xl,
              opacity: pressed ? 0.85 : 1
            }
          ]}
        >
          <Text style={{ color: "white", fontWeight: "bold" }}>{t('common.retry')}</Text>
        </Pressable>
      )}
    </View>
  );
}
