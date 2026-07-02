import { useColorScheme } from "@/hooks/use-color-scheme";
import { Stack, useRouter } from 'expo-router';
import { Pressable, Platform } from "react-native";
import { Colors, Spacing } from '@/constants/theme';
import CloseIcon from "@/assets/icons/svg/x.svg";

export default function AuthLayout() {
  const router = useRouter();
  const themeName = (useColorScheme() ?? 'light') as keyof typeof Colors;
  const theme = Colors[themeName];

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerShown: Platform.OS !== 'web',
          headerShadowVisible: false,
          headerStyle: {
            backgroundColor: theme.background,
          },
          headerTintColor: theme.text,
          headerLeft: () => null,
          headerRight: () => (
            <Pressable 
              onPress={() => router.back()} 
              style={({ pressed }) => ({
                padding: Spacing.xs,
                opacity: pressed ? 0.6 : 1
              })}
            >
              <CloseIcon width={28} height={28} color={theme.text} />
            </Pressable>
          ),
          headerTitle: "",
        }}
      />
    </Stack>
  );
}