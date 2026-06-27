import { useColorScheme } from "@/hooks/use-color-scheme";
import { Stack } from "expo-router";
import { View } from "react-native";
import { Colors, Spacing } from "@/constants/theme";
import { CategoryHeader } from "@/components/ui/display/category-header";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const unstable_settings = {
  initialRouteName: "index",
};

export default function MoreLayout() {
  const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
  const theme = Colors[themeName];
  const insets = useSafeAreaInsets();

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
          headerShown: true,
          header: () => (
            <View style={{ backgroundColor: theme.background, paddingTop: insets.top + Spacing.md }}>
              <CategoryHeader title="Mai multe" />
            </View>
          ),
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
