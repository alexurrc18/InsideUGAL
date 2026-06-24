import { router } from "expo-router";
import React, { useEffect } from "react";
import { useColorScheme, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Colors } from "@/constants/theme";
import api, { storage } from "@/services/api";

export default function SplashScreen() {
  const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
  const theme = Colors[themeName];
  useEffect(() => {
    let isRedirected = false;

    const redirect = () => {
      if (!isRedirected) {
        isRedirected = true;
        router.replace("/(public)/acasa");
      }
    };

    // Maximum timeout of 3 seconds so the user is never stuck
    const maxTimeout = setTimeout(redirect, 3000);

    const prefetchData = async () => {
      try {
        await Promise.all([
          api.get("/announcements/", {
            params: { page: 1, size: 50 }
          }).then(res => {
            if (res.data && res.data.items) {
              return storage.setItem('cached_announcements', JSON.stringify(res.data.items));
            }
          }),
          api.get("/faculties/", {
            params: { page: 1, size: 50 }
          }).then(res => {
            if (res.data && res.data.items) {
              return storage.setItem('cached_faculties', JSON.stringify(res.data.items));
            }
          }),
          api.get("/locations/", {
            params: { page: 1, size: 50 }
          }).then(res => {
            if (res.data && res.data.items) {
              return storage.setItem('cached_facilities', JSON.stringify(res.data.items));
            }
          })
        ]);
        console.log("[Splash] Successfully pre-fetched all public API data.");
      } catch (err) {
        console.warn("[Splash] Error pre-fetching data:", err);
      } finally {
        redirect();
      }
    };

    prefetchData();

    return () => {
      clearTimeout(maxTimeout);
    };
  }, []);

  return (
    <LinearGradient
      colors={["#00479E", "#003578"]}
      style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
    >
      <Image
        source={require("@/assets/images/campus-stiintei.png")}
        contentFit="cover"
        style={[StyleSheet.absoluteFill, { mixBlendMode: "overlay", opacity: 0.5 } as any]}
      />
      <Image
        source={require("@/assets/images/logo.png")}
        contentFit="contain"
        style={{ width: 150, height: 150 }}
      />
    </LinearGradient>
  );
}