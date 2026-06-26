import { Pressable } from "react-native";
import { Stack, useRouter } from "expo-router";

import { ColorScheme, Spacing } from "@/constants/theme";

import BackIcon from "@/assets/icons/svg/chevron-left.svg";

export const unstable_settings = {
    initialRouteName: "index",
};

export default function LineupLayout() {
    const router = useRouter();

    return (
        <Stack screenOptions={{
            headerShadowVisible: false,
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
