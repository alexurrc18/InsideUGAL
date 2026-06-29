// Root layout DOAR pentru web. Mobilul foloseste _layout.tsx (neatins).
// Rolul lui: monteaza ThemeProvider deasupra TUTUROR grupurilor — (public) si
// (auth) — ca tema (light/dark) sa fie respectata si pe paginile de auth.
import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { ThemeProvider } from "@/contexts/theme-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { AuthProvider } from "@/contexts/auth-context";

SplashScreen.preventAutoHideAsync();

SplashScreen.setOptions({
  duration: 250,
  fade: true
});

export default function RootLayout() {
  const [loaded] = useFonts({
    "InstrumentSans-Bold": require("@/assets/fonts/InstrumentSans-Bold.ttf"),
    "InstrumentSans-SemiBold": require("@/assets/fonts/InstrumentSans-SemiBold.ttf"),
    "InstrumentSans-Medium": require("@/assets/fonts/InstrumentSans-Medium.ttf"),
    "InstrumentSans-Regular": require("@/assets/fonts/InstrumentSans-Regular.ttf"),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </ThemeProvider>
  );
}

// Ruleaza in interiorul ThemeProvider, deci poate citi tema pentru navigatie.
function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <NavigationThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(public)" options={{ animation: 'none' }} />
        <Stack.Screen name="(auth)" options={{ presentation: 'formSheet' }} />
      </Stack>
    </NavigationThemeProvider>
  );
}
