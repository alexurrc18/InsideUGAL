import React from "react";
import { View, Text, StyleSheet, useColorScheme } from "react-native";
import { Image } from "expo-image";
import { Colors, Spacing } from "@/constants/theme";
import { Typography } from "@/constants/typography";
import AlertOctagonIcon from "@/assets/icons/svg/alert-octagon.svg";
import { getFormattedDate } from "@/utils/date";

export interface Sesizare {
  id: string;
  title: string;
  category: string;
  status: "active" | "respinse" | "finalizate";
  date: string;
  description: string;
  location: string;
  isUserReport: boolean;
  image?: string;
}

interface SesizareCardProps {
  item: Sesizare;
}

export function SesizareCard({ item }: SesizareCardProps) {
  const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
  const theme = Colors[themeName];
  const statusLabel = item.status === "active" ? "Activă" : item.status === "respinse" ? "Respinsă" : "Soluționată";

  return (
    <View style={styles.card}>
      <View style={{ flexDirection: "row", gap: Spacing.md }}>
        <Image
          source={item.image ? { uri: item.image } : require("@/assets/images/campus-stiintei.png")}
          style={{ width: 100, height: 100, borderRadius: 10 }}
          contentFit="cover"
        />

        <View style={{ flex: 1, justifyContent: "center", gap: 4 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={styles.footerItem}>
              <Text style={[Typography.Small1, { color: theme.textSecondary }]} numberOfLines={1}>
                {item.location}
              </Text>
            </View>

            <View style={styles.footerItem}>
              <AlertOctagonIcon width={13} height={13} color={theme.primary} style={{ marginRight: 4 }} />
              <Text style={[Typography.Small1, { color: theme.text }]}>
                {statusLabel}
              </Text>
            </View>
          </View>

          <Text style={[Typography.Heading4, { color: theme.text }]} numberOfLines={2}>
            {item.title}
          </Text>

          <View style={styles.cardFooter}>
            <View style={styles.footerItem}>
              <Text style={[Typography.Small2, { color: theme.textSecondary }]}>
                {getFormattedDate(item.date)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: Spacing.md,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: Spacing.xs,
  },
  footerItem: {
    flexDirection: "row",
    alignItems: "center",
  },
});
