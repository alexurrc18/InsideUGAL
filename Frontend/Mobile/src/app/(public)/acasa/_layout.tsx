import { Pressable, Text, useColorScheme } from "react-native";
import { Stack, useRouter } from "expo-router";

import { Colors, ColorScheme } from "@/constants/theme";
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
                  <Pressable onPress={() => router.back()} style={{ marginHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <BackIcon width={24} height={24} color={ColorScheme.white} />
                    <Text style={[Typography.Paragraph1, { color: theme.background }]}>Mergi înapoi</Text>
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
                  <Pressable onPress={() => router.back()} style={{ marginHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <BackIcon width={24} height={24} color={ColorScheme.white} />
                    <Text style={[Typography.Paragraph1, { color: ColorScheme.white }]}>Mergi înapoi</Text>
                  </Pressable>
                ),
              }}
            />

        </Stack>
    );
}
