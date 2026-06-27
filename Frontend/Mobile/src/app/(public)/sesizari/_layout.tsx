import { useColorScheme } from "@/hooks/use-color-scheme";
import { Pressable, View, Platform } from "react-native";
import Animated, { useSharedValue, withSpring, useAnimatedStyle } from "react-native-reanimated";
import { Stack, useRouter, useGlobalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors, Spacing } from "@/constants/theme";
import BackIcon from "@/assets/icons/svg/chevron-left.svg";
import PlusIcon from "@/assets/icons/svg/plus.svg";
import { CategoryHeader, FilterItem } from "@/components/ui/display/category-header";
import { InteractiveGlass } from "@/components/ui/layout/interactive-glass";

export const unstable_settings = {
  initialRouteName: "index",
};

export default function SesizariLayout() {
  const router = useRouter();
  const params = useGlobalSearchParams();
  const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
  const theme = Colors[themeName];
  const insets = useSafeAreaInsets();
  const activeFilter = (params.filter as string) || "toate";

  const scalePlusAnim = useSharedValue(1);
  const scalePlusStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scalePlusAnim.value }],
  }));

  const handlePressInPlus = () => {
    scalePlusAnim.set(withSpring(1.12, { stiffness: 300, damping: 15, mass: 0.5 }));
  };

  const handlePressOutPlus = () => {
    scalePlusAnim.set(withSpring(1.0, { stiffness: 300, damping: 15, mass: 0.5 }));
  };

  const filters: FilterItem[] = [
    { id: "toate", title: "Toate sesizările" },
    { id: "mele", title: "Sesizările mele" },
    { id: "active", title: "Active" },
    { id: "respinse", title: "Respinse" },
    { id: "finalizate", title: "Finalizate" },
  ];

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
              <CategoryHeader
                title="Sesizări"
                filters={filters}
                selectedFilterId={activeFilter}
                onSelectFilter={(id) => {
                  router.setParams({ filter: id || "mele" });
                }}
                autoAbbreviate={false}
                rightElement={
                  Platform.OS === 'ios' ? (
                    <Pressable
                      onPress={() => router.push("/(public)/sesizari/adauga")}
                      style={{ padding: 0 }}
                    >
                      <InteractiveGlass
                        style={{
                          padding: Spacing.xs,
                          borderRadius: 20,
                        }}
                      >
                        <PlusIcon width={24} height={24} color={theme.text} style={{margin: 5}} />
                      </InteractiveGlass>
                    </Pressable>
                  ) : (
                    <Pressable
                      onPress={() => router.push("/(public)/sesizari/adauga")}
                      onPressIn={handlePressInPlus}
                      onPressOut={handlePressOutPlus}
                      style={({ pressed }) => [
                        {
                          opacity: pressed ? 0.85 : 1
                        }
                      ]}
                    >
                      <Animated.View style={scalePlusStyle}>
                        <View
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            justifyContent: "center",
                            alignItems: "center",
                            backgroundColor: theme.primary
                          }}
                        >
                          <PlusIcon width={20} height={20} color="#FFFFFF" />
                        </View>
                      </Animated.View>
                    </Pressable>
                  )
                }
              />
            </View>
          ),
        }}
      />
      <Stack.Screen
        name="adauga"
        options={{
          headerShown: true,
          headerTitle: "Sesizare nouă",
          headerLeft: () => (
            <Pressable 
              onPress={() => router.back()} 
              style={{ padding: Spacing.xs }}
            >
              <BackIcon width={28} height={28} color={theme.text} />
            </Pressable>
          ),
        }}
      />
      <Stack.Screen
        name="detalii"
        options={{
          headerShown: true,
          headerTransparent: true,
          headerTitle: "",
          headerLeft: () => (
            <Pressable 
              onPress={() => router.back()} 
              style={{ padding: Spacing.xs }}
            >
              <BackIcon width={28} height={28} color={theme.text} />
            </Pressable>
          ),
        }}
      />
    </Stack>
  );
}
