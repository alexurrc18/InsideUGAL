import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
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

// Web: deschidere/inchidere pe click cu animatie (max-height) — vezi global.css
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
    <View
      style={{ width: "100%" }}
      {...({ dataSet: { expandable: "true", expanded: isExpanded ? "open" : "closed" } } as any)}
    >
      <Pressable
        onPress={toggleExpand}
        style={({ pressed }) => [
          {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingVertical: Spacing.lg,
            paddingHorizontal: Spacing.lg,
          },
          { opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <Text style={[Typography.Heading3, { color: theme.text }]}>{title}</Text>
        <View
          {...({ dataSet: { expandableChevron: "true" } } as any)}
          style={{ transform: [{ rotate: isExpanded ? "90deg" : "-90deg" }] }}
        >
          <ChevronIcon width={30} height={30} fill={theme.text} />
        </View>
      </Pressable>

      <View {...({ dataSet: { expandableBody: "true" } } as any)}>
        <View {...({ dataSet: { expandableInner: "true" } } as any)} style={{ paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg }}>
          {children}
        </View>
      </View>
    </View>
  );
}
