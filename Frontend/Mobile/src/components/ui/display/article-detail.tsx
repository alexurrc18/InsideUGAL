// UI-ul paginii de detaliu (eveniment / anunt / facultate / facilitate), extras
// din vizualizare.web.tsx ca sa poata fi REUTILIZAT de mai multe rute.
//
// Componenta e "prostuta": primeste datele ca props si doar le afiseaza. Nu citeste
// parametri din URL si nu seteaza SEO — astea raman in fisierul de ruta, ca fiecare
// ruta sa-si poata alege singura titlul/descrierea/JSON-LD-ul.
//
// Folosita doar din fisiere web (.web.tsx), deci nu intra in bundle-ul de mobil.
import { useState, useEffect } from "react";
import { View, Text, ScrollView, Linking, TouchableOpacity, Alert, useWindowDimensions, StyleSheet, type LayoutChangeEvent } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, ColorScheme, Spacing } from "@/constants/theme";
import { Typography } from "@/constants/typography";
import { getFormattedDate, getReadingTime, isoToRomanianDateStr } from "@/utils/date";
import { WebContainer } from "@/components/ui/layout/web-container";
import { Breadcrumbs, type Crumb } from "@/components/ui/navigation/breadcrumbs";
import { CompactCard } from "@/components/ui/display/home-highlights";
import { NewsCard, CategoryTag } from "@/components/ui/display/news-card";
import { eventHref, anuntHref } from "@/utils/article-url";
import api, { storage } from "@/services/api";

import CalendarIcon from "@/assets/icons/svg/calendar.svg";
import LocationIcon from "@/assets/icons/svg/location.svg";
import PhoneIcon from "@/assets/icons/svg/phone.svg";
import WebsiteIcon from "@/assets/icons/svg/globe-europe.svg";

// Latimea coloanei din dreapta (sidebar) cand layout-ul e pe doua coloane.
const SIDEBAR_WIDTH = 340;
// Sub acest prag continutul si sidebarul se stivuiesc vertical.
const TWO_COL_BREAKPOINT = 900;

export interface ArticleDetailProps {
    type?: string;
    title?: string;
    category?: string;
    content?: string;
    image?: string;
    location?: string;
    date_start?: string;
    date_end?: string;
    time_start?: string;
    time_end?: string;
    posted_at?: string;
    address?: string;
    phone?: string;
    website?: string;
    date?: string;
}

export function ArticleDetail({
    type,
    title = "",
    category = "",
    content = "",
    image = "",
    location = "",
    date_start = "",
    date_end = "",
    time_start = "",
    time_end = "",
    posted_at = "",
    address = "",
    phone = "",
    website = "",
    date = "",
}: ArticleDetailProps) {
    const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
    const theme = Colors[themeName];
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { width } = useWindowDimensions();
    const twoCol = width >= TWO_COL_BREAKPOINT;

    const tipPagina = type || "Eveniment";

    const [relatedPool, setRelatedPool] = useState<any[]>([]);

    useEffect(() => {
        let isMounted = true;
        const loadRelated = async () => {
            try {
                let cachedStr = await storage.getItem('cached_announcements');
                let items = [];
                if (cachedStr) {
                    items = JSON.parse(cachedStr);
                } else {
                    const res = await api.get('/announcements/', { params: { page: 1, size: 20 } });
                    if (res.data?.items) {
                        items = res.data.items;
                    }
                }
                if (isMounted) {
                    setRelatedPool(items);
                }
            } catch (err) {
                console.warn('[ArticleDetail] Error loading related announcements:', err);
            }
        };
        loadRelated();
        return () => {
            isMounted = false;
        };
    }, []);

    // Anunturi inrudite: prioritizam aceeasi categorie ca articolul curent, apoi
    // completam cu restul. Excludem articolul curent (dupa titlu). Sidebar-ul ia
    // primele, "Mai multe" ia urmatoarele (distincte de sidebar).
    const pool = relatedPool
        .filter((item: any) => item.title !== title)
        .map((item: any) => ({
            id: item.id.toString(),
            type: item.type === "NOUTATE" ? "Anunț" : "Eveniment",
            title: item.title || "Titlu necunoscut",
            category: item.type === "NOUTATE" ? "Noutăți" : "Evenimente",
            content: item.content || "Conținut necunoscut",
            image: item.image_url || "",
            location: item.location_name || "Locație necunoscută",
            date_start: isoToRomanianDateStr(item.start_date) || "",
            date_end: isoToRomanianDateStr(item.end_date) || "",
            time_start: item.start_date ? new Date(item.start_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
            time_end: item.end_date ? new Date(item.end_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
            posted_at: isoToRomanianDateStr(item.created_at) || "",
            date: isoToRomanianDateStr(item.start_date) || "Dată necunoscută",
            author: item.author || "Autor necunoscut",
            created_at: item.created_at,
            updated_at: item.updated_at,
        }));
    const sameCategory = pool.filter((e) => e.category === category);
    const otherCategory = pool.filter((e) => e.category !== category);
    const ordered = [...sameCategory, ...otherCategory];

    const sidebarItems = ordered.slice(0, 3);
    const relatedItems = ordered.slice(3, 6);

    // Latimea masurata a randului de jos, impartita egal la numarul de carduri.
    const [rowWidth, setRowWidth] = useState(0);
    const onRowLayout = (e: LayoutChangeEvent) => setRowWidth(e.nativeEvent.layout.width);
    const bottomCount = relatedItems.length;
    const bottomCardWidth =
        rowWidth > 0 && bottomCount > 0 ? (rowWidth - (bottomCount - 1) * Spacing.lg) / bottomCount : 0;

    // Navigare catre alt articol. Evenimentele si anunturile au URL curat.
    const openItem = (item: any) => {
        if (item.category === "Evenimente") {
            router.push(eventHref(item) as any);
            return;
        }
        if (item.category === "Noutăți") {
            router.push(anuntHref(item) as any);
            return;
        }
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

    const formattedDate = getFormattedDate(date || posted_at);
    const readingTime = getReadingTime(content);
    const dateDisplay = category === "Noutăți" ? `${formattedDate} | ${readingTime}` : formattedDate;

    // Breadcrumbs: Acasă / [categorie sau tip] / [titlu]. Segmentul de categorie
    // duce la lista categoriei respective; ultimul (titlul) nu e clickabil.
    const crumbCategory = category || tipPagina;
    const crumbs: Crumb[] = [
        { label: "Acasă", href: "/(public)/acasa" },
        ...(crumbCategory
            ? [{ label: crumbCategory, href: `/(public)/acasa/categorie?title=${encodeURIComponent(crumbCategory)}` }]
            : []),
        { label: title || "Articol" },
    ];

    return (
        <View style={{ flex: 1, backgroundColor: theme.background }}>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + Spacing.xl }}>
                {/* Banner full-bleed: ramane pe toata latimea, in afara canvas-ului scalat */}
                <View style={{ width: "100%", height: 320 }}>
                    <Image
                        source={image ? { uri: image } : require("@/assets/images/campus-stiintei.png")}
                        accessibilityLabel={title || "Imagine articol"}
                        style={{ width: "100%", height: "100%", position: "absolute" }}
                        contentFit="cover"
                    />

                    {/* Gradient pentru lizibilitatea titlului (care e jos): transparent
                        sus -> negru jos. */}
                    <LinearGradient
                        pointerEvents="none"
                        colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.8)"]}
                        start={{ x: 0.5, y: 0 }}
                        end={{ x: 0.5, y: 1 }}
                        style={StyleSheet.absoluteFill}
                    />

                    <View style={{ flex: 1, paddingVertical: Spacing.lg, justifyContent: "flex-end" }}>
                        <WebContainer style={{ gap: Spacing.xs }}>
                            {category && (tipPagina === "Eveniment" || tipPagina === "Anunț") ? (
                                <CategoryTag category={category} />
                            ) : (
                                <Text style={[Typography.Paragraph2, { color: ColorScheme.white }]}>
                                    {category || (tipPagina === "Facultate" ? "Facultate" : "Categorie")}
                                </Text>
                            )}
                            <Text
                                accessibilityRole="header"
                                {...({ "aria-level": 1 } as any)}
                                style={[Typography.Heading2, { color: ColorScheme.white }]}
                            >
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
                    <View style={{ flexDirection: twoCol ? "row" : "column", gap: 64, alignItems: twoCol ? "flex-start" : "stretch" }}>
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
                                                    <TouchableOpacity onPress={() => Linking.openURL(website)}>
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
