import { useState } from "react";
import { View, Text, ScrollView, useColorScheme, Linking, TouchableOpacity, Alert, StyleSheet, Platform, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, ColorScheme, Spacing } from "@/constants/theme";
import { Typography } from "@/constants/typography";
import { getFormattedDate, getReadingTime } from "@/utils/date";

import CalendarIcon from "@/assets/icons/svg/calendar.svg";
import LocationIcon from "@/assets/icons/svg/location.svg";
import PhoneIcon from "@/assets/icons/svg/phone.svg";
import WebsiteIcon from "@/assets/icons/svg/globe-europe.svg";
import MOCK_DATA from "@/constants/mock-data.json";
import { CategoryTag } from "@/components/ui/display/news-card";
import BackIcon from "@/assets/icons/svg/chevron-left.svg";

function VizualizareScreen() {
    const params = useLocalSearchParams();
    const id = params.id as string;
    const router = useRouter();
    const { width } = useWindowDimensions();
    const [scrolledPast, setScrolledPast] = useState(false);

    const isDesktop = Platform.OS === "web" || width >= 768;

    const handleScroll = (event: any) => {
        if (isDesktop) return;
        const offsetY = event.nativeEvent.contentOffset.y;
        if (offsetY > 240) {
            if (!scrolledPast) setScrolledPast(true);
        } else {
            if (scrolledPast) setScrolledPast(false);
        }
    };

    // Look up mock data if id is provided
    let mockItem: any = null;
    if (id) {
        mockItem = MOCK_DATA.events.find(e => e.id === id) ||
                   MOCK_DATA.faculties.find(f => f.id === id) ||
                   MOCK_DATA.facilities.find(fac => fac.id === id);
    }

    const type = (params.type as string) || (mockItem ? (mockItem.id.startsWith("fac") ? "Facilitate" : mockItem.id.startsWith("f") ? "Facultate" : (mockItem.category === "Evenimente" ? "Eveniment" : "Anunț")) : undefined);
    const title = (params.title as string) || mockItem?.title || "";
    const category = (params.category as string) || mockItem?.category || (mockItem ? (mockItem.id.startsWith("fac") ? "Facilitate" : mockItem.id.startsWith("f") ? "Facultate" : "") : "");
    const content = (params.content as string) || mockItem?.content || "";
    const image = (params.image as string) || mockItem?.image || "";
    const location = (params.location as string) || mockItem?.location || "";
    const date_start = (params.date_start as string) || mockItem?.date_start || "";
    const date_end = (params.date_end as string) || mockItem?.date_end || "";
    const time_start = (params.time_start as string) || mockItem?.time_start || "";
    const time_end = (params.time_end as string) || mockItem?.time_end || "";
    const posted_at = (params.posted_at as string) || mockItem?.posted_at || "";
    const address = (params.address as string) || mockItem?.address || "";
    const phone = (params.phone as string) || mockItem?.phone || "";
    const website = (params.website as string) || mockItem?.website || "";
    const schedule = (params.schedule as string) || mockItem?.schedule || "";
    const date = (params.date as string) || mockItem?.date || "";
    
    const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
    const theme = Colors[themeName];
    const insets = useSafeAreaInsets();

    const tipPagina = type || "Eveniment";

    const handleCall = () => {
        Alert.alert(
            tipPagina === "Facultate" ? "Contact Facultate" : "Contact Facilitate",
            `Doriți să apelați numărul ${phone}?`,
            [
                { text: "Anulează", style: "cancel" },
                { text: "Sună", onPress: () => Linking.openURL(`tel:${phone}`) }
            ]
        );
    };

    const formattedDate = getFormattedDate(date as string || posted_at as string);
    const readingTime = getReadingTime(content as string);
    const dateDisplay = category === "Noutăți" ? `${formattedDate} | ${readingTime}` : formattedDate;

    return (
        <View style={{ flex: 1, backgroundColor: theme.background }}>
            <Stack.Screen
                options={{
                    headerTransparent: true,
                    headerBackground: () => (
                        <View 
                            style={{ 
                                flex: 1, 
                                backgroundColor: theme.background, 
                                opacity: scrolledPast ? 1 : 0 
                            }} 
                        />
                    ),
                    headerShadowVisible: false,
                    headerTintColor: scrolledPast ? theme.text : ColorScheme.white,
                    headerTitle: scrolledPast ? (title || "Detalii") : "",
                    headerLeft: () => (
                        <TouchableOpacity 
                            onPress={() => router.back()} 
                            style={{ 
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <BackIcon width={24} height={24} color={scrolledPast ? theme.text : ColorScheme.white} />
                        </TouchableOpacity>
                    ),
                }}
            />
            <ScrollView 
                style={{ flex: 1 }} 
                contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + Spacing.xl }}
                onScroll={handleScroll}
                scrollEventThrottle={16}
            >
                <View style={{ width: "100%", height: 320 }}>
                    <Image
                        source={image ? { uri: image as string } : require("@/assets/images/campus-stiintei.png")}
                        style={{ width: "100%", height: "100%", position: "absolute" }}
                        contentFit="cover"
                    />

                    <LinearGradient
                        colors={["transparent", "rgba(0,0,0,0.8)"]}
                        style={StyleSheet.absoluteFill}
                    />

                    <View style={{ flex: 1, padding: Spacing.lg, justifyContent: "flex-end", gap: Spacing.xs }}>
                        {category && (tipPagina === "Eveniment" || tipPagina === "Anunț") ? (
                            <CategoryTag category={category} />
                        ) : (
                            <Text style={[Typography.Paragraph2, { color: ColorScheme.white }]}>
                                {category || (tipPagina === "Facultate" ? "Facultate" : tipPagina === "Facilitate" ? "Facilitate" : "Categorie")}
                            </Text>
                        )}
                        <Text style={[Typography.Heading2, { color: ColorScheme.white }]}>
                            {title || "Titlu"}
                        </Text>
                    </View>
                </View>

                <View style={{ padding: Spacing.lg, gap: Spacing.xxl }}>
                    {tipPagina !== "Facultate" && tipPagina !== "Facilitate" && (
                        <Text style={[Typography.Paragraph3, { color: theme.textSecondary }]}>
                            {dateDisplay || "Dată necunoscută"}
                        </Text>
                    )}
                    
                    {tipPagina === "Eveniment" && (
                        <View style={{ gap: Spacing.md }}>
                            <Text style={[Typography.Heading4, { color: theme.text }]}>
                                Informații eveniment
                            </Text>

                            <View style={{ gap: Spacing.md }}>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.md }}>
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
                                <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.md }}>
                                    <LocationIcon width={24} height={24} color={theme.primary} />
                                    <View>
                                        <Text style={[Typography.Heading5, { color: theme.text }]}>
                                            {location || "Locație nespecificată"}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    )}

                    {(tipPagina === "Facultate" || tipPagina === "Facilitate") && (
                        <View style={{ gap: Spacing.md }}>
                            <Text style={[Typography.Heading4, { color: theme.text }]}>
                                Contact și Locație
                            </Text>

                            <View style={{ gap: Spacing.lg }}>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.md }}>
                                    <LocationIcon width={24} height={24} color={theme.primary} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={[Typography.Paragraph3, { color: theme.textSecondary }]}>Adresă</Text>
                                        <Text style={[Typography.Heading5, { color: theme.text }]}>
                                            {address || "Nespecificată"}
                                        </Text>
                                    </View>
                                </View>
                                
                                {phone && (
                                    <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.md }}>
                                        <PhoneIcon width={24} height={24} color={theme.primary} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={[Typography.Paragraph3, { color: theme.textSecondary }]}>Telefon</Text>
                                            <TouchableOpacity onPress={handleCall}>
                                                <Text style={[Typography.Heading5, { color: theme.text }]}>
                                                    {phone}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                )}

                                {website && (
                                    <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.md }}>
                                        <WebsiteIcon width={24} height={24} color={theme.primary} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={[Typography.Paragraph3, { color: theme.textSecondary }]}>Website</Text>
                                            <TouchableOpacity onPress={() => Linking.openURL(website as string)}>
                                                <Text style={[Typography.Heading5, { color: theme.secondary }]}>
                                                    {website}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                )}

                                {schedule && (
                                    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: Spacing.md }}>
                                        <CalendarIcon width={24} height={24} color={theme.primary} style={{ marginTop: 2 }} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={[Typography.Paragraph3, { color: theme.textSecondary }]}>Program</Text>
                                            <Text style={[Typography.Heading5, { color: theme.text }]}>
                                                {schedule}
                                            </Text>
                                        </View>
                                    </View>
                                )}
                            </View>
                        </View>
                    )}

                    <View style={{ gap: Spacing.md }}>
                        <Text style={[Typography.Heading4, { color: theme.text }]}>
                            {tipPagina === "Eveniment" ? "Despre eveniment" : tipPagina === "Facultate" ? "Despre facultate" : tipPagina === "Facilitate" ? "Despre facilitate" : "Detalii anunț"}
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

export default VizualizareScreen;
