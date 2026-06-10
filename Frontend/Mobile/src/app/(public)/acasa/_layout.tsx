import { Pressable, Text, useColorScheme } from "react-native";
import { Stack, useRouter } from "expo-router";

import { Colors, ColorScheme, Spacing } from "@/constants/theme";
import { Typography } from "@/constants/typography";

import BackIcon from "@/assets/icons/svg/chevron-left.svg";

export default function LineupLayout() {
    const router = useRouter();
    const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
    const theme = Colors[themeName];

    return (
        <Stack screenOptions={{
            headerShadowVisible: false,
            animation: 'none',
        }}>

            {/* INDEX*/}
            <Stack.Screen
                name="index"
                options={{
                    headerShown: false,
                }}
            />

            <Stack.Screen
              name="categorie"
              options={{
                headerShown: true,
                headerTransparent: true,
                headerTitle: "",
                headerLeft: () => (
                  <Pressable onPress={() => router.back()} style={{ padding: Spacing.xs }}>
                    <BackIcon width={28} height={28} color={ColorScheme.white} />
                  </Pressable>
                ),
              }}
            />

            <Stack.Screen
              name="vizualizare"
              options={{
                headerShown: true,
                headerTransparent: true,
                headerTitle: "",
                headerLeft: () => (
                  <Pressable onPress={() => router.back()} style={{ padding: Spacing.xs }}>
                    <BackIcon width={28} height={28} color={ColorScheme.white} />
                  </Pressable>
                ),
              }}
            />

        </Stack>
    );
}
