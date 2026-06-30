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

export function NotificareCard({
  item,
  theme,
  isUnread = false,
  onPress,
  showDivider = false,
  hoverBg,
  unreadBg,
}: NotificareCardProps) {
  
  const CardContent = (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: Spacing.sm }}>
        <Text style={[Typography.Small2, { color: theme.textSecondary }]}>
          {item.data}
        </Text>
        {isUnread && (
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.primary }} />
        )}
      </View>
      <Text
        style={[
          Typography.Heading5,
          { 
            color: theme.text, 
            fontFamily: isUnread ? "InstrumentSans-SemiBold" : "InstrumentSans-Medium" 
          },
        ]}
      >
        {item.titlu}
      </Text>
      <Text
        style={[
          Typography.Paragraph3,
          { 
            color: theme.textSecondary, 
            lineHeight: 20 
          }
        ]}
        numberOfLines={3}
      >
        {item.continut}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed, hovered }: any) => [
          {
            paddingHorizontal: Spacing.lg,
            paddingVertical: Spacing.md,
          },
          isUnread && unreadBg ? { backgroundColor: unreadBg } : null,
          (pressed || hovered) && hoverBg ? { backgroundColor: hoverBg } : null,
        ]}
      >
        {CardContent}
      </Pressable>
    );
  }

  return (
    <View style={{
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
    }}>
      {CardContent}
    </View>
  );
}
