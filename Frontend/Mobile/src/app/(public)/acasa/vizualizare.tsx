import React from "react";
import { View, Text, ScrollView, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import { Colors, ColorScheme } from "@/constants/theme";
import { Typography } from "@/constants/typography";

import CalendarIcon from "@/assets/icons/svg/calendar.svg";

import LocationIcon from "@/assets/icons/svg/location.svg";

export default function VizualizareScreen() {
    const { 
        type, 
        title, 
        category, 
        content, 
        image, 
        location, 
        date_start, 
        date_end, 
        time_start, 
        time_end,
        posted_at 
    } = useLocalSearchParams();
    
    const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
    const theme = Colors[themeName];
    const insets = useSafeAreaInsets();

    const tipPagina = type || "Eveniment";

    return (
        <View style={{ flex: 1, backgroundColor: theme.background }}>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 20 }}>
                <View style={{ width: "100%", height: 285 }}>
                    <Image
                        source={image ? { uri: image as string } : require("@/assets/images/campus-stiintei.png")}
                        style={{ width: "100%", height: "100%", position: "absolute" }}
                        contentFit="cover"
                    />

                    <View style={{ flex: 1, padding: 16, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.3)" }}>
                        <Text style={[Typography.Paragraph2, { color: ColorScheme.white }]}>
                            {category || "Categorie"}
                        </Text>
                        <Text style={[Typography.Heading2, { color: ColorScheme.white }]}>
                            {title || "Titlu"}
                        </Text>
                    </View>
                </View>

                <View style={{ padding: 16, gap: 24 }}>
                    <Text style={[Typography.Paragraph3, { color: theme.textSecondary }]}>
                        {posted_at ? `${posted_at}` : "Data postării necunoscută"}
                    </Text>
                    {tipPagina === "Eveniment" && (
                        <View style={{ gap: 12 }}>
                            <Text style={[Typography.Heading4, { color: theme.text }]}>
                                Informații eveniment
                            </Text>

                            <View style={{ gap: 12 }}>
                                <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
                                    <CalendarIcon width={24} height={24} color={theme.primary} />
                                    <View>
                                        <Text style={[Typography.Heading5, { color: theme.text }]}>
                                            De pe {date_start || "N/A"} {time_start || ""}
                                        </Text>
                                        <Text style={[Typography.Heading5, { color: theme.text }]}>
                                            Până la {date_end || "N/A"} {time_end || ""}
                                        </Text>
                                    </View>
                                </View>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                                    <LocationIcon width={24} height={24} color={theme.primary} />
                                    <View>
                                        <Text style={[Typography.Heading5, { color: theme.text }]}>
                                            {location || "Locație nespecificată"}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            <Text style={[Typography.Heading5, { color: theme.secondary, marginTop: 4 }]}>
                                + Adaugă în calendar
                            </Text>
                        </View>
                    )}

                    <View style={{ gap: 12 }}>
                        <Text style={[Typography.Heading4, { color: theme.text }]}>
                            {tipPagina === "Eveniment" ? "Despre eveniment" : "Detalii anunț"}
                        </Text>
                        <Text style={[Typography.Paragraph2, { color: theme.text, lineHeight: 25 }]}>
                            {content || "Conținutul nu este disponibil."}
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}
