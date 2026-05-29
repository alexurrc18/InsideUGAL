import { NativeTabs } from 'expo-router/unstable-native-tabs';
import React from 'react';
import { useColorScheme, Pressable } from 'react-native';
import { Colors, ColorScheme } from "@/constants/theme";
import { Typography } from "@/constants/typography";
import ChatIcon from "@/assets/icons/svg/message-circle-captions.svg";

export default function TabLayout() {
    const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
    const theme = Colors[themeName];
    const activeColor = theme.primary;

    return (
        <NativeTabs
            labelStyle={{
                color: activeColor,
            }}
            tintColor={activeColor}
            minimizeBehavior="onScrollDown"
        >
            <NativeTabs.Trigger name="acasa">
                <NativeTabs.Trigger.Icon
                    src={{
                        /* temporar pana la svg fix */
                        default: require("@/assets/icons/png/home.png"),
                        selected: require("@/assets/icons/png/home-filled.png")
                    }}
                    renderingMode="template"
                />
                <NativeTabs.Trigger.Label>Acasă</NativeTabs.Trigger.Label>
            </NativeTabs.Trigger>

            <NativeTabs.Trigger name="harta">
                <NativeTabs.Trigger.Icon
                    src={{
                        default: require("@/assets/icons/png/map.png"),
                        selected: require("@/assets/icons/png/map-filled.png")
                    }}
                    renderingMode="template"
                />
                <NativeTabs.Trigger.Label>Hartă</NativeTabs.Trigger.Label>
            </NativeTabs.Trigger>

            <NativeTabs.Trigger name="cantina">
                <NativeTabs.Trigger.Icon
                    src={{
                        default: require("@/assets/icons/png/fork-knife.png"),
                        selected: require("@/assets/icons/png/fork-knife-filled.png")
                    }}
                    renderingMode="template"
                />
                <NativeTabs.Trigger.Label>Cantină</NativeTabs.Trigger.Label>
            </NativeTabs.Trigger>

            <NativeTabs.Trigger name="sesizari">
                <NativeTabs.Trigger.Icon
                    src={{
                        default: require("@/assets/icons/png/traffic-cone.png"),
                        selected: require("@/assets/icons/png/traffic-cone-filled.png")
                    }}
                    renderingMode="template"
                />
                <NativeTabs.Trigger.Label>Sesizări</NativeTabs.Trigger.Label>
            </NativeTabs.Trigger>

            <NativeTabs.Trigger name="more">
                <NativeTabs.Trigger.Icon
                    src={{
                        default: require("@/assets/icons/png/dots-horizontal-rounded.png"),
                        selected: require("@/assets/icons/png/dots-horizontal-rounded-filled.png")
                    }}
                    renderingMode="template"
                />
                <NativeTabs.Trigger.Label>Mai multe</NativeTabs.Trigger.Label>
            </NativeTabs.Trigger>
        </NativeTabs>
    );
}
