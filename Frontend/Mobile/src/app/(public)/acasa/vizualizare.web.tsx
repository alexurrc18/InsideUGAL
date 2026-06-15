import { useState } from "react";
import { View, Text, ScrollView, Linking, TouchableOpacity, Alert, useWindowDimensions, StyleSheet, type LayoutChangeEvent } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, ColorScheme, Spacing } from "@/constants/theme";
import { Typography } from "@/constants/typography";
import { getFormattedDate, getReadingTime } from "@/utils/date";
import { WebContainer } from "@/components/ui/web-container";
import { Breadcrumbs, type Crumb } from "@/components/ui/breadcrumbs";
import { CompactCard } from "@/components/ui/home-highlights";
import { NewsCard } from "@/components/ui/news-card";
import MOCK_DATA from "@/constants/mock-data.json";

import CalendarIcon from "@/assets/icons/svg/calendar.svg";
import LocationIcon from "@/assets/icons/svg/location.svg";
import PhoneIcon from "@/assets/icons/svg/phone.svg";
import WebsiteIcon from "@/assets/icons/svg/globe-europe.svg";

// Latimea coloanei din dreapta (sidebar) cand layout-ul e pe doua coloane.
const SIDEBAR_WIDTH = 340;
// Sub acest prag continutul si sidebarul se stivuiesc vertical.
const TWO_COL_BREAKPOINT = 900;

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
    const router = useRouter();
    const { width } = useWindowDimensions();
    const twoCol = width >= TWO_COL_BREAKPOINT;

    const tipPagina = type || "Eveniment";

    // Anunturi inrudite: prioritizam aceeasi categorie ca articolul curent, apoi
    // completam cu restul. Excludem articolul curent (dupa titlu). Sidebar-ul ia
    // primele, "Mai multe" ia urmatoarele (distincte de sidebar).
    const pool = MOCK_DATA.events.filter((e) => e.title !== title);
    const sameCategory = pool.filter((e) => e.category === (category as string));
    const otherCategory = pool.filter((e) => e.category !== (category as string));
    const ordered = [...sameCategory, ...otherCategory];

    const sidebarItems = ordered.slice(0, 3);
    const relatedItems = ordered.slice(3, 6);

    // Latimea masurata a randului de jos, impartita egal la numarul de carduri.
    const [rowWidth, setRowWidth] = useState(0);
    const onRowLayout = (e: LayoutChangeEvent) => setRowWidth(e.nativeEvent.layout.width);
    const bottomCount = relatedItems.length;
    const bottomCardWidth =
        rowWidth > 0 && bottomCount > 0 ? (rowWidth - (bottomCount - 1) * Spacing.lg) / bottomCount : 0;

    // Navigare catre alt anunt (aceeasi pagina, parametri noi).
    const openItem = (item: any) => {
        router.push({
            pathname: "/(public)/acasa/vizualizare",
            params: {
                type: item.category === "Evenimente" ? "Eveniment" : "Anunț",
                title: item.title,
                category: item.category,
                content: item.content,
                image: item.image,
                location: item.location,
                date_start: item.date_start,
                date_end: item.date_end,
                time_start: item.time_start,
                time_end: item.time_end,
                date: item.date_start || item.date,
            },
        });
    };

    const handleCall = () => {
        Alert.alert(
            "Contact Facultate",
            `Doriți să apelați numărul ${phone}?`,
            [
                { text: "Anulează", style: "cancel" },
                { text: "Sună", onPress: () => Linking.openURL(`tel:${phone}`) },
            ]
        );
    };

    const formattedDate = getFormattedDate((date as string) || (posted_at as string));
    const readingTime = getReadingTime(content as string);
    const dateDisplay = category === "Noutăți" ? `${formattedDate} | ${readingTime}` : formattedDate;

    // Breadcrumbs: Acasă / [categorie sau tip] / [titlu]. Segmentul de categorie
    // duce la lista categoriei respective; ultimul (titlul) nu e clickabil.
    const crumbCategory = (category as string) || (tipPagina as string);
    const crumbs: Crumb[] = [
        { label: "Acasă", href: "/(public)/acasa" },
        ...(crumbCategory
            ? [{ label: crumbCategory, href: `/(public)/acasa/categorie?title=${encodeURIComponent(crumbCategory)}` }]
            : []),
        { label: (title as string) || "Articol" },
    ];

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

                    {/* Gradient pentru lizibilitatea titlului (care e jos): transparent
                        sus -> negru jos. */}
                    <LinearGradient
                        pointerEvents="none"
                        colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.85)"]}
                        start={{ x: 0.5, y: 0 }}
                        end={{ x: 0.5, y: 1 }}
                        style={StyleSheet.absoluteFill}
                    />

                    <View style={{ flex: 1, paddingVertical: Spacing.lg, justifyContent: "flex-end" }}>
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

                <WebContainer style={{ paddingVertical: Spacing.xl, gap: Spacing.xxl }}>
                    {/* Breadcrumbs pentru navigare clara pe paginile de continut. */}
                    <Breadcrumbs items={crumbs} />

                    {/* Rand principal: continut (stanga) + sidebar Noutăți (dreapta).
                        gap putin mai mare ca sa "respire" intre coloana de text si carduri. */}
                    <View style={{ flexDirection: twoCol ? "row" : "column", gap: 64, alignItems: "flex-start" }}>
                        {/* Stanga: continutul anuntului. */}
                        <View style={{ flex: 1, gap: Spacing.xxl, width: "100%" }}>
                            {tipPagina !== "Facultate" && (
                                <Text style={[Typography.Paragraph3, { color: theme.textSecondary }]}>
                                    {dateDisplay || "Dată necunoscută"}
                                </Text>
                            )}

                            {tipPagina === "Eveniment" && (
                                <View style={{ gap: Spacing.md }}>
                                    <Text style={[Typography.Heading4, { color: theme.text, fontFamily: "InstrumentSans-SemiBold", fontWeight: "600" }]}>Informații eveniment</Text>
                                    <View style={{ gap: Spacing.md }}>
                                        <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.md }}>
                                            <CalendarIcon width={24} height={24} color={theme.primary} />
                                            <View>
                                                <Text style={[Typography.Paragraph2, { color: theme.text }]}>
                                                    De pe {date_start || "N/A"} {time_start || ""}
                                                </Text>
                                                <Text style={[Typography.Paragraph2, { color: theme.text }]}>
                                                    Până la {date_end || "N/A"} {time_end || ""}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.md }}>
                                            <LocationIcon width={24} height={24} color={theme.primary} />
                                            <View>
                                                <Text style={[Typography.Paragraph2, { color: theme.text }]}>
                                                    {location || "Locație nespecificată"}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            )}

                            {tipPagina === "Facultate" && (
                                <View style={{ gap: Spacing.md }}>
                                    <Text style={[Typography.Heading4, { color: theme.text }]}>Contact și Locație</Text>
                                    <View style={{ gap: Spacing.lg }}>
                                        <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.md }}>
                                            <LocationIcon width={24} height={24} color={theme.primary} />
                                            <View style={{ flex: 1 }}>
                                                <Text style={[Typography.Paragraph3, { color: theme.textSecondary }]}>Adresă</Text>
                                                <Text style={[Typography.Paragraph2, { color: theme.text }]}>
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
                                                        <Text style={[Typography.Paragraph2, { color: theme.text }]}>{phone}</Text>
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
                                                        <Text style={[Typography.Paragraph2, { color: theme.secondary }]}>{website}</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            )}

                            <View style={{ gap: Spacing.md }}>
                                <Text style={[Typography.Heading4, { color: theme.text, fontFamily: "InstrumentSans-SemiBold", fontWeight: "600" }]}>
                                    {tipPagina === "Eveniment" ? "Despre eveniment" : tipPagina === "Facultate" ? "Despre facultate" : "Detalii anunț"}
                                </Text>
                                <Text style={[Typography.Paragraph2, { color: theme.text, lineHeight: 25 }]}>
                                    {content || "Conținutul nu este disponibil."}
                                </Text>
                            </View>
                        </View>

                        {/* Dreapta: 3 carduri Noutăți, una sub alta. */}
                        {sidebarItems.length > 0 && (
                            <View style={{ width: twoCol ? SIDEBAR_WIDTH : "100%", gap: Spacing.lg }}>
                                <Text style={[Typography.Heading2, { color: theme.text }]}>Articole similare</Text>
                                {sidebarItems.map((item) => (
                                    <CompactCard key={item.id} item={item} onPress={() => openItem(item)} />
                                ))}
                            </View>
                        )}
                    </View>

                    {/* Jos, sub tot: 3 carduri pe un rand. */}
                    {relatedItems.length > 0 && (
                        <View style={{ gap: Spacing.lg }}>
                            <Text style={[Typography.Heading2, { color: theme.text }]}>Mai multe</Text>
                            <View style={{ flexDirection: "row", gap: Spacing.lg }} onLayout={onRowLayout}>
                                {bottomCardWidth > 0 &&
                                    relatedItems.map((item) => (
                                        <NewsCard
                                            key={item.id}
                                            width={bottomCardWidth}
                                            title={item.title}
                                            date={getFormattedDate(item.date_start || item.date)}
                                            author={item.author}
                                            image={item.image}
                                            onPress={() => openItem(item)}
                                        />
                                    ))}
                            </View>
                        </View>
                    )}
                </WebContainer>
            </ScrollView>
        </View>
    );
}

export default VizualizareScreen;
