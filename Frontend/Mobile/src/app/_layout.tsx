import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from "@/hooks/use-color-scheme";
import { View } from 'react-native';

SplashScreen.preventAutoHideAsync();

SplashScreen.setOptions({
  duration: 250,
  fade: true
});

export default function RootLayout() {
  const colorScheme = useColorScheme();
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
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <View style={{ flex: 1 }}>

        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(public)" options={{ animation: 'none' }} />
          <Stack.Screen name="(auth)" options={{ presentation: 'formSheet' }} />
          <Stack.Screen name="ace" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
        </Stack>
      </View>
    </ThemeProvider>
  );
}