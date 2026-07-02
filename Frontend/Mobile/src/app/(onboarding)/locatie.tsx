import { useRouter } from "expo-router";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { Spacing, ColorScheme, Colors } from "@/constants/theme";
import { Typography } from "@/constants/typography";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { storage } from "@/services/api";
import { useTranslation } from 'react-i18next';
import * as Location from "expo-location";
import LocationSvg from "@/assets/instructions/location.svg";

export default function LocatieScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
  const theme = Colors[themeName];

  const { t } = useTranslation();

  const handleContinue = async () => {
    await Location.requestForegroundPermissionsAsync();
    await storage.setItem("has_seen_onboarding", "true");
    router.replace("/(public)/acasa");
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
            {t('onboarding.exploreTitle')}
          </Text>
          <Text style={[Typography.Paragraph1, { color: theme.textOnDark, textAlign: "center" }]}>
            {t('onboarding.exploreDesc')}
          </Text>
        </View>

        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <LocationSvg width="100%" height="100%" />
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
            <Text style={[Typography.Heading5, { color: ColorScheme.white }]}>{t('onboarding.continue')}</Text>
          </Pressable>

          <View style={{ flexDirection: "row", gap: Spacing.sm, alignSelf: "center", alignItems: "center" }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: ColorScheme.white, opacity: 0.35 }} />
            <View style={{ width: 24, height: 8, borderRadius: 4, backgroundColor: ColorScheme.white }} />
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}
