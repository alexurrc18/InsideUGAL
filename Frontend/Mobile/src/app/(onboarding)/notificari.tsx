// Disabled — notifications onboarding removed
import { useEffect } from "react";
import { useRouter } from "expo-router";
import { View } from "react-native";

export default function NotificariScreen() {
  const router = useRouter();
  useEffect(() => { router.replace("/(onboarding)/locatie" as any); }, []);
  return <View />;
}
