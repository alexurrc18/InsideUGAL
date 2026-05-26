import { Tabs } from "expo-router";
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColorScheme } from "react-native";
import { Colors, ColorScheme } from "@/constants/theme";

import HomeIcon from "@/assets/icons/home.svg";
import MapIcon from "@/assets/icons/map.svg";
import CantinaIcon from "@/assets/icons/fork-knife.svg";
import SesizariIcon from "@/assets/icons/alert-octagon.svg";
import MoreIcon from "@/assets/icons/dots-horizontal-rounded.svg";

export default function TabLayout() {
  const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
  const theme = Colors[themeName];
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: ColorScheme.blue,
        tabBarInactiveTintColor: theme.textSecondary,
        headerShown: false,
        tabBarShowLabel: true,
        tabBarItemStyle: { justifyContent: "center", alignItems: "center", paddingVertical: 4 },
        tabBarIconStyle: { marginBottom: 5 },
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: "IstrumentSans-Medium",
          fontWeight: "500",
        },
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopWidth: 0,
          paddingTop: 10,
          paddingLeft: 5,
          paddingRight: 5,
          height: 70 + insets.bottom
        },
      }}
    >
      <Tabs.Screen
        name="acasa/index"
        options={{
          title: "Acasă",
          tabBarIcon: ({ color }) => <HomeIcon width={30} height={30} fill={color} />,
        }}
      />
      <Tabs.Screen
        name="harta"
        options={{
          title: "Hartă",
          tabBarIcon: ({ color }) => <MapIcon width={30} height={30} fill={color} />,
        }}
      />

      <Tabs.Screen
        name="cantina/index"
        options={{
          title: "Cantină",
          tabBarIcon: ({ color }) => <CantinaIcon width={30} height={30} fill={color} />,
        }}
      />

      <Tabs.Screen
        name="sesizari/index"
        options={{
          title: "Sesizări",
          tabBarIcon: ({ color }) => <SesizariIcon width={30} height={30} fill={color} />,
        }}
      />

      <Tabs.Screen
        name="more/index"
        options={{
          title: "Mai multe",
          tabBarIcon: ({ color }) => <MoreIcon width={30} height={30} fill={color} />,
        }}
      />
    </Tabs>
  );
}