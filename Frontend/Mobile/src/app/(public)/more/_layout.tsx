import { Stack } from "expo-router";
import { useColorScheme } from "react-native";
import { Colors } from "@/constants/theme";

export const unstable_settings = {
  initialRouteName: "index",
};

export default function MoreLayout() {
  const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
  const theme = Colors[themeName];

  return (
    <Stack screenOptions={{
      headerShadowVisible: false,
      animation: 'slide_from_right',
      headerStyle: {
        backgroundColor: theme.background,
      },
      headerTintColor: theme.text,
      headerTitleStyle: {
        fontFamily: "InstrumentSans-Bold",
        fontSize: 18,
      },
    }}>
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
        }}
      />
      <Stack.Screen
        name="setari"
        options={{
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="limba"
        options={{
          presentation: "modal",
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="tema"
        options={{
          presentation: "modal",
          headerShown: true,
        }}
      />
    </Stack>
  );
}
