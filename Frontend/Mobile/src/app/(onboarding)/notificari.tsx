import { useRouter } from "expo-router";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { Spacing, ColorScheme, Colors } from "@/constants/theme";
import { Typography } from "@/constants/typography";
import { useColorScheme } from "@/hooks/use-color-scheme";
import * as Notifications from "expo-notifications";
import NotificationSvg from "@/assets/instructions/notification.svg";

export default function NotificariScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
  const theme = Colors[themeName];

  const handleContinue = async () => {
    await Notifications.requestPermissionsAsync();
    router.push("/(onboarding)/locatie");
  };

  return (
    <LinearGradient
      colors={["#00305C", "#001A38"]}
      style={{ flex: 1 }}
    >
      <Image
        source={require("@/assets/images/campus-stiintei.png")}
        contentFit="cover"
        style={[StyleSheet.absoluteFill, { mixBlendMode: "overlay", opacity: 0.5 } as any]}
      />

      <View style={{
        flex: 1,
        paddingHorizontal: Spacing.xxl,
        paddingTop: insets.top + Spacing.xl3,
        paddingBottom: insets.bottom + Spacing.xxl,
        justifyContent: "space-between",
      }}>
        <View style={{ flex: 1, justifyContent: "flex-end", gap: Spacing.md, alignItems: "center", paddingBottom: Spacing.xl3 }}>
          <Text style={[Typography.Heading2, { color: theme.textOnDark, textAlign: "center" }]}>
            Nu rata
          </Text>
          <Text style={[Typography.Paragraph1, { color: theme.textOnDark, textAlign: "center" }]}>
            Stai la zi cu noile activități din campusul universitar.
          </Text>
        </View>

        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <NotificationSvg width="100%" height="100%" />
        </View>

        <View style={{ gap: Spacing.xl }}>
          <Pressable
            style={({ pressed }) => ({
              height: 56,
              borderRadius: Spacing.md,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: theme.primary,
              opacity: pressed ? 0.85 : 1,
            })}
            onPress={handleContinue}
          >
            <Text style={[Typography.Heading5, { color: ColorScheme.white }]}>Continuă</Text>
          </Pressable>

          <View style={{ flexDirection: "row", gap: Spacing.sm, alignSelf: "center", alignItems: "center" }}>
            <View style={{ width: 24, height: 8, borderRadius: 4, backgroundColor: ColorScheme.white }} />
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: ColorScheme.white, opacity: 0.35 }} />
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}