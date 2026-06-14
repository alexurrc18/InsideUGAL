import { View, Text, ScrollView, Linking, TouchableOpacity, Alert } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import { Colors, ColorScheme, Spacing } from "@/constants/theme";
import { Typography } from "@/constants/typography";
import { getFormattedDate, getReadingTime } from "@/utils/date";
import { WebContainer } from "@/components/ui/web-container";

import CalendarIcon from "@/assets/icons/svg/calendar.svg";
import LocationIcon from "@/assets/icons/svg/location.svg";
import PhoneIcon from "@/assets/icons/svg/phone.svg";
import WebsiteIcon from "@/assets/icons/svg/globe-europe.svg";
import MOCK_DATA from "@/constants/mock-data.json";

function VizualizareScreen() {
    const params = useLocalSearchParams();
    const id = params.id as string;

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
    const schedule = mockItem?.schedule || ""; // note: vizualizare.web doesn't extract schedule from search params but we keep it here for data consistency
    const date = (params.date as string) || mockItem?.date || "";

    const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
    const theme = Colors[themeName];
    const insets = useSafeAreaInsets();

    const tipPagina = type || "Eveniment";

    const handleCall = () => {
        Alert.alert(
            "Contact Facultate",
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
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + Spacing.xl }}>
                {/* Banner full-bleed: ramane pe toata latimea, in afara canvas-ului scalat */}
                <View style={{ width: "100%", height: 320 }}>
                    <Image
                        source={image ? { uri: image as string } : require("@/assets/images/campus-stiintei.png")}
                        style={{ width: "100%", height: "100%", position: "absolute" }}
                        contentFit="cover"
                    />

                    <View style={{ flex: 1, paddingVertical: Spacing.lg, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.3)" }}>
                        <WebContainer>
                        <Text style={[Typography.Paragraph2, { color: ColorScheme.white }]}>
                            {category || (tipPagina === "Facultate" ? "Facultate" : "Categorie")}
                        </Text>
                        <Text style={[Typography.Heading2, { color: ColorScheme.white }]}>
                            {title || "Titlu"}
                        </Text>
                        </WebContainer>
                    </View>
                </View>

                <WebContainer style={{ paddingVertical: Spacing.lg, gap: Spacing.xxl }}>
                    {tipPagina !== "Facultate" && (
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

                    {tipPagina === "Facultate" && (
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
                            </View>
                        </View>
                    )}

                    <View style={{ gap: Spacing.md }}>
                        <Text style={[Typography.Heading4, { color: theme.text }]}>
                            {tipPagina === "Eveniment" ? "Despre eveniment" : tipPagina === "Facultate" ? "Despre facultate" : "Detalii anunț"}
                        </Text>
                        <Text style={[Typography.Paragraph2, { color: theme.text, lineHeight: 25 }]}>
                            {content || "Conținutul nu este disponibil."}
                        </Text>
                    </View>
                </WebContainer>
            </ScrollView>
        </View>
    );
}

export default VizualizareScreen;
