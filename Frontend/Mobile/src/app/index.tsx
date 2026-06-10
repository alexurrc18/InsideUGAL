import { router } from "expo-router";
import React, { useEffect } from "react";
import { useColorScheme, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Colors } from "@/constants/theme";

export default function SplashScreen() {
  const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
  const theme = Colors[themeName];
  useEffect(() => {
    const timeout = setTimeout(() => {
      router.replace("/(public)/acasa");
    }, 5000);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <LinearGradient
      colors={["#00479E", "#003578"]}
      style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
    >
      <Image
        source={require("@/assets/images/campus-stiintei.png")}
        contentFit="cover"
        style={[StyleSheet.absoluteFill, { mixBlendMode: "overlay", opacity: 0.5 } as any]}
      />
      <Image
        source={require("@/assets/images/logo.png")}
        contentFit="contain"
        style={{ width: 150, height: 150 }}
      />
    </LinearGradient>
  );
}