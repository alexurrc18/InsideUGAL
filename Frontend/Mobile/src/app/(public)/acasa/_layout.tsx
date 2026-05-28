import React from "react";
import { Pressable, Text, useColorScheme } from "react-native";
import { Stack, useRouter } from "expo-router";

import { Colors, ColorScheme } from "@/constants/theme";
import { Typography } from "@/constants/typography";


export default function LineupLayout() {
    const router = useRouter();
    const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
    const theme = Colors[themeName];

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
                        <Pressable onPress={() => router.back()} style={{ marginHorizontal: 16 }}>
                            <Text style={[Typography.Paragraph1, { color: theme.text }]}>&lt; Mergi înapoi</Text>
                        </Pressable>
                    ),
                }}
            />

        </Stack>
    );
}