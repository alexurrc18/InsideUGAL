import React from "react";
import { View, Text, useColorScheme } from "react-native";
import { Colors } from "@/constants/theme";
import { Typography } from "@/constants/typography";

export interface MenuItemProps {
  name: string;
  price: number;
  description: string;
  isLast?: boolean;
}

export function MenuItem({ name, price, description, isLast = false }: MenuItemProps) {
  const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
  const theme = Colors[themeName];

  return (
    <View 
      style={{ 
        paddingVertical: 0, 
        gap: 5
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <Text style={[Typography.Heading5, { color: theme.text, flex: 1 }]}>
          {name}
        </Text>
        <Text style={[Typography.Heading5, { color: theme.primary, marginLeft: 8 }]}>
          {price} RON
        </Text>
      </View>
      <Text style={[Typography.Small1, { color: theme.textSecondary }]}>
        {description}
      </Text>
    </View>
  );
}
