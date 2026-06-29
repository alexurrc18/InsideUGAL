import React from "react";
import { Pressable, View, Text } from "react-native";
import { Colors, Spacing } from "@/constants/theme";
import { Typography } from "@/constants/typography";

export interface Notificare {
  id: string;
  data: string;
  titlu: string;
  continut: string;
  actiune?: string;
}

interface NotificareCardProps {
  item: Notificare;
  theme: typeof Colors.light | typeof Colors.dark;
  isUnread?: boolean;
  onPress?: () => void;
  showDivider?: boolean;
  hoverBg?: string;
  unreadBg?: string;
}

export function NotificareCard({ item, theme, isUnread = false, onPress }: NotificareCardProps) {
  const CardContent = (
    <View style={{ gap: Spacing.xs }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={[Typography.Small1, { color: theme.textSecondary }]}>
          {item.data}
        </Text>
        {isUnread && (
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.primary }} />
        )}
      </View>
      <Text style={[
        Typography.Heading4,
        {
          color: theme.text,
          fontFamily: isUnread ? "InstrumentSans-SemiBold" : "InstrumentSans-Medium",
        }
      ]}>
        {item.titlu}
      </Text>
      <Text style={[Typography.Paragraph2, { color: theme.text, lineHeight: 22 }]}>
        {item.continut}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => ({
          paddingVertical: Spacing.lg,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        {CardContent}
      </Pressable>
    );
  }

  return (
    <View style={{ paddingVertical: Spacing.lg }}>
      {CardContent}
    </View>
  );
}
