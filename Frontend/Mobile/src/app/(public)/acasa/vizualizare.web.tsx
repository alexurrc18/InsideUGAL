import { useState, useEffect } from "react";
import { View, Text, ScrollView, Linking, TouchableOpacity, Alert, useWindowDimensions, StyleSheet, type LayoutChangeEvent, ActivityIndicator } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, ColorScheme, Spacing } from "@/constants/theme";
import { Typography } from "@/constants/typography";
import { getFormattedDate, getReadingTime, isoToRomanianDateStr } from "@/utils/date";
import { WebContainer } from "@/components/ui/layout/web-container";
import { Breadcrumbs, type Crumb } from "@/components/ui/navigation/breadcrumbs";
import { CompactCard } from "@/components/ui/display/home-highlights";
import { NewsCard, CategoryTag } from "@/components/ui/display/news-card";
import { Seo } from "@/components/seo";
import api, { storage } from "@/services/api";

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
    const [scrolledPast, setScrolledPast] = useState(false);
    const [loading, setLoading] = useState(true);

    const initialItem = {
        title: (params.title as string) || "",
        category: (params.category as string) || "",
        content: (params.content as string) || "",
        image: (params.image as string) || "",
        location: (params.location as string) || "",
        date_start: (params.date_start as string) || "",
        date_end: (params.date_end as string) || "",
        time_start: (params.time_start as string) || "",
        time_end: (params.time_end as string) || "",
        posted_at: (params.posted_at as string) || "",
        address: (params.address as string) || "",
        phone: (params.phone as string) || "",
        website: (params.website as string) || "",
        schedule: (params.schedule as string) || "",
        date: (params.date as string) || "",
    };

    const [itemData, setItemData] = useState<any>(initialItem.title ? initialItem : null);
    const [relatedPool, setRelatedPool] = useState<any[]>([]);

    const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
    const theme = Colors[themeName];
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { width } = useWindowDimensions();
    const twoCol = width >= TWO_COL_BREAKPOINT;

    const type = params.type as string;
    const initialTipPagina = type || (id && id.startsWith("fac") ? "Facilitate" : id && id.startsWith("f") ? "Facultate" : "Eveniment");
    const tipPagina = itemData?.type || initialTipPagina;

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
                console.warn('[API] Error loading related announcements:', err);
            }
        };

        const loadData = async () => {
            if (!id) {
                setLoading(false);
                return;
            }

            loadRelated();

            // Try loading from cached announcements first for instant rendering!
            try {
                let cachedStr = null;
                const isFaculty = initialTipPagina === "Facultate";
                const isFacility = initialTipPagina === "Facilitate";

                if (isFaculty) {
                    cachedStr = await storage.getItem('cached_faculties');
                } else if (isFacility) {
                    cachedStr = await storage.getItem('cached_facilities');
                } else {
                    cachedStr = await storage.getItem('cached_announcements');
                }

                if (cachedStr) {
                    const cachedItems = JSON.parse(cachedStr);
                    if (Array.isArray(cachedItems)) {
                        const numericId = parseInt(id);
                        const match = cachedItems.find(item => item.id === numericId || item.id?.toString() === id);
                        if (match) {
                            let mappedItem = null;
                            if (isFaculty) {
                                mappedItem = {
                                    id: match.id.toString(),
                                    type: "Facultate",
                                    title: match.name || "Titlu necunoscut",
                                    image: match.image_url || "",
                                    address: match.address || "Adresă necunoscută",
                                    phone: match.phone || "",
                                    website: match.website_url || "",
                                    content: match.description || "Conținut necunoscut",
                                };
                            } else if (isFacility) {
                                mappedItem = {
                                    id: match.id.toString(),
                                    type: "Facilitate",
                                    title: match.name || "Titlu necunoscut",
                                    image: match.image_url || "",
                                    address: match.address || "Adresă necunoscută",
                                    phone: match.phone || "",
                                    website: match.website_url || "",
                                    content: match.name || "Conținut necunoscut",
                                    schedule: match.schedule || "",
                                };
                            } else {
                                mappedItem = {
                                    id: match.id.toString(),
                                    type: match.type === "NOUTATE" ? "Anunț" : "Eveniment",
                                    title: match.title || "Titlu necunoscut",
                                    category: match.type === "NOUTATE" ? "Noutăți" : "Evenimente",
                                    content: match.content || "Conținut necunoscut",
                                    image: match.image_url || "",
                                    location: match.location_name || "Locație necunoscută",
                                    date_start: isoToRomanianDateStr(match.start_date) || "",
                                    date_end: isoToRomanianDateStr(match.end_date) || "",
                                    time_start: match.start_date ? new Date(match.start_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
                                    time_end: match.end_date ? new Date(match.end_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
                                    posted_at: isoToRomanianDateStr(match.created_at) || "",
                                    date: isoToRomanianDateStr(match.start_date) || "Dată necunoscută",
                                    author: match.author || "Autor necunoscut",
                                    created_at: match.created_at,
                                    updated_at: match.updated_at,
                                };
                            }

                            if (isMounted && mappedItem) {
                                setItemData(mappedItem);
                                setLoading(false);
                            }
                        }
                    }
                }
            } catch (cacheErr) {
                console.warn("[Cache] Error loading item from cache:", cacheErr);
            }

            // Fetch updates in the background to ensure details are correct
            if (!fetchedItemRef()) {
                setLoading(true);
            }
            try {
                let fetchedItem: any = null;
                const numericId = parseInt(id);
                const isNumeric = !isNaN(numericId);

                if (isNumeric) {
                    try {
                        if (initialTipPagina === "Eveniment" || initialTipPagina === "Anunț") {
                            const res = await api.get(`/announcements/${numericId}`);
                            if (res.data) {
                                const item = res.data;
                                fetchedItem = {
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
                                };
                            }
                        } else if (initialTipPagina === "Facultate") {
                            const res = await api.get(`/faculties/${numericId}`);
                            if (res.data) {
                                const item = res.data;
                                fetchedItem = {
                                    id: item.id.toString(),
                                    type: "Facultate",
                                    title: item.name || "Titlu necunoscut",
                                    image: item.image_url || "",
                                    address: item.address || "Adresă necunoscută",
                                    phone: item.phone || "",
                                    website: item.website_url || "",
                                    content: item.description || "Conținut necunoscut",
                                };
                            }
                        } else if (initialTipPagina === "Facilitate") {
                            const res = await api.get(`/locations/${numericId}`);
                            if (res.data) {
                                const item = res.data;
                                fetchedItem = {
                                    id: item.id.toString(),
                                    type: "Facilitate",
                                    title: item.name || "Titlu necunoscut",
                                    image: item.image_url || "",
                                    address: item.address || "Adresă necunoscută",
                                    phone: item.phone || "",
                                    website: item.website_url || "",
                                    content: item.name || "Conținut necunoscut",
                                    schedule: item.schedule || "",
                                };
                            }
                        }
                    } catch (apiErr) {
                        console.warn("[API] Could not fetch details:", apiErr);
                    }
                }

                if (isMounted) {
                    setItemData(fetchedItem);
                }
            } catch (err) {
                console.error("[Loader] Error loading detail page:", err);
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        // Helper ref-like getter to read current value inside callback
        const fetchedItemRef = () => itemData;

        loadData();
        return () => {
            isMounted = false;
        };
    }, [id, initialTipPagina]);

    const title = itemData?.title || "";
    const category = itemData?.category || "";
    const content = itemData?.content || "";
    const image = itemData?.image || "";
    const location = itemData?.location || "";
    const date_start = itemData?.date_start || "";
    const date_end = itemData?.date_end || "";
    const time_start = itemData?.time_start || "";
    const time_end = itemData?.time_end || "";
    const posted_at = itemData?.posted_at || "";
    const address = itemData?.address || "";
    const phone = itemData?.phone || "";
    const website = itemData?.website || "";
    const schedule = itemData?.schedule || "";
    const date = itemData?.date || "";

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
                id: item.id,
                type: item.category === "Evenimente" ? "Eveniment" : "Anunț",
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

    const displayDateValue = category === "Noutăți"
        ? (posted_at && posted_at !== "Dată necunoscută" ? posted_at : "")
        : (date && date !== "Dată necunoscută" ? date : posted_at);

    const formattedDate = getFormattedDate(displayDateValue as string);
    const readingTime = getReadingTime(content as string);
    const dateDisplay = category === "Noutăți" ? (formattedDate ? `${formattedDate} | ${readingTime}` : "Dată necunoscută") : (formattedDate || "Dată necunoscută");

    const createdTime = itemData?.created_at ? new Date(itemData.created_at).getTime() : 0;
    const updatedTime = itemData?.updated_at ? new Date(itemData.updated_at).getTime() : 0;
    const isUpdated = createdTime > 0 && updatedTime > 0 && Math.abs(updatedTime - createdTime) > 60000;
    const formattedUpdateDate = itemData?.updated_at ? getFormattedDate(isoToRomanianDateStr(itemData.updated_at)) : "";

    if (loading && !itemData) {
        return (
            <View style={{ flex: 1, backgroundColor: theme.background, justifyContent: "center", alignItems: "center", height: 400 }}>
                <ActivityIndicator size="large" color={theme.primary} />
            </View>
        );
    }

    if (!itemData) {
        return (
            <View style={{ flex: 1, backgroundColor: theme.background, justifyContent: "center", alignItems: "center", padding: Spacing.xl, height: 400 }}>
                <Text style={[Typography.Heading3, { color: theme.text, textAlign: "center", marginBottom: Spacing.md }]}>
                    Detaliile nu au putut fi găsite
                </Text>
                <TouchableOpacity onPress={() => router.back()} style={{ backgroundColor: theme.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderRadius: Spacing.md }}>
                    <Text style={{ color: ColorScheme.white, fontWeight: "bold" }}>Înapoi</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Breadcrumbs: Acasă / [categorie sau tip] / [titlu]. Segmentul de categorie
    // duce la lista categoriei respective; ultimul (titlul) nu e clickabil.
    const crumbCategory = (category as string) || (tipPagina as string);
    const crumbs: Crumb[] = [
        { label: "Acasă", href: "/(public)/acasa" },
        ...(crumbCategory
            ? [{ label: crumbCategory, href: `/(public)/acasa/categorie?title=${encodeURIComponent(crumbCategory)}` }]
            : []),
        { label: (title as string) || "Titlu necunoscut" },
    ];

    // SEO: descriere din continut + date structurate (Event / NewsArticle).
    const seoDescription = (content as string).slice(0, 160) || `${title} — InsideUGAL`;
    const jsonLd =
        tipPagina === "Eveniment"
            ? {
                  "@context": "https://schema.org",
                  "@type": "Event",
                  name: title,
                  ...(date_start ? { startDate: date_start } : {}),
                  ...(date_end ? { endDate: date_end } : {}),
                  ...(location ? { location: { "@type": "Place", name: location } } : {}),
                  ...(image ? { image: [image] } : {}),
                  ...(content ? { description: content } : {}),
              }
            : tipPagina === "Anunț"
            ? {
                  "@context": "https://schema.org",
                  "@type": "NewsArticle",
                  headline: title,
                  ...(image ? { image: [image] } : {}),
                  ...(content ? { articleBody: content } : {}),
              }
            : null;

    return (
        <View style={{ flex: 1, backgroundColor: theme.background }}>
            <Seo title={(title as string) || "Articol"} description={seoDescription}>
                {jsonLd ? (
                    <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
                ) : null}
            </Seo>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + Spacing.xl }}>
                {/* Banner full-bleed: ramane pe toata latimea, in afara canvas-ului scalat */}
                <View style={{ width: "100%", height: 320 }}>
                    <Image
                        source={image ? { uri: image as string } : require("@/assets/images/campus-stiintei.png")}
                        accessibilityLabel={(title as string) || "Imagine articol"}
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
                                {title || "Titlu necunoscut"}
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
                                <View style={{ gap: Spacing.xs }}>
                                    <Text style={[Typography.Paragraph3, { color: theme.textSecondary }]}>
                                        {dateDisplay}
                                    </Text>
                                    {isUpdated && formattedUpdateDate ? (
                                        <Text style={[Typography.Paragraph3, { color: theme.textSecondary }]}>
                                            Actualizat: {formattedUpdateDate}
                                        </Text>
                                    ) : null}
                                </View>
                            )}

                            {tipPagina === "Eveniment" && (
                                <View style={{ gap: Spacing.md }}>
                                    <Text style={[Typography.Heading4, { color: theme.text, fontFamily: "InstrumentSans-SemiBold", fontWeight: "600" }]}>Informații eveniment</Text>
                                    <View style={{ gap: Spacing.md }}>
                                        <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.md }}>
                                            <CalendarIcon width={24} height={24} color={theme.primary} />
                                            <View>
                                                <Text style={[Typography.Paragraph2, { color: theme.text }]}>
                                                    De pe {date_start || "Dată de început necunoscută"} {time_start || ""}
                                                </Text>
                                                <Text style={[Typography.Paragraph2, { color: theme.text }]}>
                                                    Până la {date_end || "Dată de sfârșit necunoscută"} {time_end || ""}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.md }}>
                                            <LocationIcon width={24} height={24} color={theme.primary} />
                                            <View>
                                                <Text style={[Typography.Paragraph2, { color: theme.text }]}>
                                                    {location || "Locație necunoscută"}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            )}

                            {(tipPagina === "Facultate" || tipPagina === "Facilitate") && (
                                <View style={{ gap: Spacing.md }}>
                                    <Text style={[Typography.Heading4, { color: theme.text }]}>Contact și Locație</Text>
                                    <View style={{ gap: Spacing.lg }}>
                                        <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.md }}>
                                            <LocationIcon width={24} height={24} color={theme.primary} />
                                            <View style={{ flex: 1 }}>
                                                <Text style={[Typography.Paragraph3, { color: theme.textSecondary }]}>Adresă</Text>
                                                <Text style={[Typography.Paragraph2, { color: theme.text }]}>
                                                    {address || "Adresă necunoscută"}
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
                                    {content || "Conținut necunoscut"}
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
