import { useColorScheme } from "@/hooks/use-color-scheme";
import React from "react";
import { View, Text } from "react-native";
import { Colors, Spacing } from "@/constants/theme";
import { Typography } from "@/constants/typography";

export interface MenuItemProps {
  name: string;
  price: number | string;
  description: string;
  quantity?: string;
  isLast?: boolean;
}

export function MenuItem({ name, price, description, quantity, isLast = false }: MenuItemProps) {
  const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
  const theme = Colors[themeName];

  return (
    <View 
      style={{ 
        paddingVertical: 0, 
        gap: Spacing.xs
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <Text style={[Typography.Heading5, { color: theme.text, flex: 1 }]}>
          {name}
        </Text>
        <Text style={[Typography.Heading5, { color: theme.primary, marginLeft: Spacing.sm }]}>
          {price} RON
        </Text>
      </View>
      {(quantity || description) && (
        <Text style={[Typography.Small1, { color: theme.textSecondary }]}>
          {[quantity, description].filter(Boolean).join(" • ")}
        </Text>
      )}
    </View>
  );
}
