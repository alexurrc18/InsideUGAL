import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { View } from 'react-native';
import { ColorScheme, Spacing, WebSidePadding } from "@/constants/theme";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LanguageToggle } from "@/components/ui/language-toggle";
import { useT } from "@/i18n/use-t";

export default function TabLayout() {
    const activeColor = ColorScheme.white;
    const t = useT();

    // ThemeProvider e montat in root-ul web (_layout.web.tsx), deasupra tuturor grupurilor.
    return (
        <>
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
                    <NativeTabs.Trigger.Label>{t("tabs.home")}</NativeTabs.Trigger.Label>
                </NativeTabs.Trigger>

                <NativeTabs.Trigger name="harta">
                    <NativeTabs.Trigger.Icon
                        src={{
                            default: require("@/assets/icons/png/map.png"),
                            selected: require("@/assets/icons/png/map-filled.png")
                        }}
                        renderingMode="template"
                    />
                    <NativeTabs.Trigger.Label>{t("tabs.map")}</NativeTabs.Trigger.Label>
                </NativeTabs.Trigger>

                <NativeTabs.Trigger name="cantina">
                    <NativeTabs.Trigger.Icon
                        src={{
                            default: require("@/assets/icons/png/fork-knife.png"),
                            selected: require("@/assets/icons/png/fork-knife-filled.png")
                        }}
                        renderingMode="template"
                    />
                    <NativeTabs.Trigger.Label>{t("tabs.canteen")}</NativeTabs.Trigger.Label>
                </NativeTabs.Trigger>

                <NativeTabs.Trigger name="sesizari">
                    <NativeTabs.Trigger.Icon
                        src={{
                            default: require("@/assets/icons/png/traffic-cone.png"),
                            selected: require("@/assets/icons/png/traffic-cone-filled.png")
                        }}
                        renderingMode="template"
                    />
                    <NativeTabs.Trigger.Label>{t("tabs.reports")}</NativeTabs.Trigger.Label>
                </NativeTabs.Trigger>

                <NativeTabs.Trigger name="more">
                    <NativeTabs.Trigger.Icon
                        src={{
                            default: require("@/assets/icons/png/dots-horizontal-rounded.png"),
                            selected: require("@/assets/icons/png/dots-horizontal-rounded-filled.png")
                        }}
                        renderingMode="template"
                    />
                    <NativeTabs.Trigger.Label>{t("tabs.more")}</NativeTabs.Trigger.Label>
                </NativeTabs.Trigger>
            </NativeTabs>

            {/* Butoane limba + tema, flotant sus-dreapta, aliniate cu bara (top: 24) */}
            <View style={{ position: "absolute", top: 24, right: WebSidePadding, zIndex: 10, flexDirection: "row", alignItems: "center", gap: Spacing.sm }}>
                <LanguageToggle />
                <ThemeToggle />
            </View>
        </>
    );
}
