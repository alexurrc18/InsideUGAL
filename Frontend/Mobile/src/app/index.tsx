import { router } from "expo-router";
import React, { useEffect } from "react";
import { StyleSheet } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import api, { storage } from "@/services/api";

export default function SplashScreen() {
  useEffect(() => {
    let isRedirected = false;

    const redirect = async () => {
      if (!isRedirected) {
        isRedirected = true;
        const hasSeenOnboarding = await storage.getItem("has_seen_onboarding");
        if (hasSeenOnboarding === "true") {
          router.replace("/(public)/acasa");
        } else {
          router.replace("/(onboarding)/notificari");
        }
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
        redirect();
      } catch (err) {
        console.warn("[Splash] Error pre-fetching data:", err);
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