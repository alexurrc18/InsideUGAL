import { router } from "expo-router";
import React, { useEffect } from "react";
import { useColorScheme, View } from "react-native";
import { Image } from "expo-image";
import { Colors } from "@/constants/theme";

export default function SplashScreen() {
  const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
  const theme = Colors[themeName];
  const test = 1;

  useEffect(() => {
    if (test === 1) {
      router.replace("/(public)/acasa");
    } else {
      const timeout = setTimeout(() => {
        router.replace("/(public)/acasa");
      }, 5000);

      return () => clearTimeout(timeout);
    }
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.background }}>
      <Image
        source={require("@/assets/images/logo.png")}
        contentFit="cover"
        style={{ width: "100%", height: "100%" }}
      />
    </View>
  );
}