import { useColorScheme } from "@/hooks/use-color-scheme";
import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Colors, Spacing } from "@/constants/theme";
import { Typography } from "@/constants/typography";
import ChevronIcon from "@/assets/icons/svg/chevron-left.svg";

interface ExpandableProps {
  title: string;
  children: React.ReactNode;
  initialExpanded?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
}

export function Expandable({ title, children, initialExpanded = false, expanded, onToggle }: ExpandableProps) {
  const [internalExpanded, setInternalExpanded] = useState(initialExpanded);
  const isControlled = expanded !== undefined;
  const isExpanded = isControlled ? expanded : internalExpanded;
  const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
  const theme = Colors[themeName];

  const toggleExpand = () => {
    if (isControlled) {
      onToggle?.();
    } else {
      setInternalExpanded((v) => !v);
    }
  };

  return (
    <View style={{ width: "100%" }}>
      <Pressable 
        onPress={toggleExpand} 
        style={({ pressed }) => [
          {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: Spacing.lg,
            paddingBottom: 0,
            paddingHorizontal: 0,
          }, 
          { opacity: pressed ? 0.7 : 1 }
        ]}
      >
        <Text style={[Typography.Heading3, { color: theme.text }]}>
          {title}
        </Text>
        <View style={{ transform: [{ rotate: isExpanded ? "90deg" : "-90deg" }] }}>
          <ChevronIcon 
            width={30} 
            height={30} 
            fill={theme.text} 
          />
        </View>
      </Pressable>
      
      {isExpanded && (
        <View style={{ paddingHorizontal: 0, paddingTop: Spacing.xxs, overflow: "hidden" }}>
          {children}
        </View>
      )}
    </View>
  );
}
