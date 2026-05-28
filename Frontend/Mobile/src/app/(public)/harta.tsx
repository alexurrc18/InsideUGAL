import React from "react";
import { View, Text, ScrollView, Pressable, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { Colors } from "@/constants/theme";

export default function HartaScreen() {
  const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
  const theme = Colors[themeName];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View>
      
    </View>
  );
}