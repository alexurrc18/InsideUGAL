import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';
import { Colors } from "@/constants/theme";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSafeAreaInsets } from "react-native-safe-area-context";


SplashScreen.setOptions({
  duration: 250,
  fade: true
});



export default function RootLayout() {
  const colorScheme = useColorScheme();
  const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
  const theme = Colors[themeName];


  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(public)" options={{ animation: "fade", animationDuration: 250 }}/>
        </Stack>
    </ThemeProvider>
  );
}