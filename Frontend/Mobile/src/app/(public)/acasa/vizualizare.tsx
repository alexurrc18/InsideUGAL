import { useState, useEffect } from "react";
import { View, Text, ScrollView, useColorScheme, Linking, TouchableOpacity, Alert, StyleSheet, Platform, useWindowDimensions, ActivityIndicator, InteractionManager } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, ColorScheme, Spacing } from "@/constants/theme";
import { Typography } from "@/constants/typography";
import { getFormattedDate, getReadingTime, isoToRomanianDateStr } from "@/utils/date";
import api, { storage } from "@/services/api";

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

    const type = params.type as string;
    const initialTipPagina = type || (id && id.startsWith("fac") ? "Facilitate" : id && id.startsWith("f") ? "Facultate" : "Eveniment");
    const tipPagina = itemData?.type || initialTipPagina;

    useEffect(() => {
        let isMounted = true;
        let interactionTask: any = null;

        const loadData = async () => {
            if (!id) {
                setLoading(false);
                return;
            }

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

            // Defer load until transition finishes so navigation is instant and lag-free
            interactionTask = InteractionManager.runAfterInteractions(async () => {
                // If we don't have itemData yet, show the loader
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
                            console.warn("[API] Could not fetch details, falling back to mock:", apiErr);
                        }
                    }

                    if (!fetchedItem && id) {
                        const mock = (MOCK_DATA.events.find(e => e.id === id) ||
                                      MOCK_DATA.faculties.find(f => f.id === id) ||
                                      MOCK_DATA.facilities.find(fac => fac.id === id)) as any;
                        if (mock) {
                            fetchedItem = {
                                id: mock.id,
                                type: mock.category === "Evenimente" ? "Eveniment" : (mock.id.startsWith("fac") ? "Facilitate" : (mock.id.startsWith("f") ? "Facultate" : "Anunț")),
                                title: mock.title || (mock as any).name || "Titlu necunoscut",
                                category: mock.category || (mock.id.startsWith("fac") ? "Facilitate" : mock.id.startsWith("f") ? "Facultate" : ""),
                                content: mock.content || (mock as any).description || "Conținut necunoscut",
                                image: mock.image || "",
                                location: mock.location || "Locație necunoscută",
                                date_start: mock.date_start || "",
                                date_end: mock.date_end || "",
                                time_start: mock.time_start || "",
                                time_end: mock.time_end || "",
                                posted_at: mock.posted_at || "",
                                date: mock.date || mock.date_start || "Dată necunoscută",
                                author: mock.author || "Autor necunoscut",
                                address: (mock as any).address || "Adresă necunoscută",
                                phone: (mock as any).phone || "",
                                website: (mock as any).website || "",
                                schedule: (mock as any).schedule || "",
                            };
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
            });
        };

        // Helper ref-like getter to read current value inside callback
        const fetchedItemRef = () => itemData;

        loadData();
        return () => {
            isMounted = false;
            if (interactionTask) {
                interactionTask.cancel();
            }
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

    const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
    const theme = Colors[themeName];
    const insets = useSafeAreaInsets();

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
            <View style={{ flex: 1, backgroundColor: theme.background, justifyContent: "center", alignItems: "center" }}>
                <ActivityIndicator size="large" color={theme.primary} />
            </View>
        );
    }

    if (!itemData) {
        return (
            <View style={{ flex: 1, backgroundColor: theme.background, justifyContent: "center", alignItems: "center", padding: Spacing.xl }}>
                <Text style={[Typography.Heading3, { color: theme.text, textAlign: "center", marginBottom: Spacing.md }]}>
                    Detaliile nu au putut fi găsite
                </Text>
                <TouchableOpacity onPress={() => router.back()} style={{ backgroundColor: theme.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderRadius: Spacing.md }}>
                    <Text style={{ color: ColorScheme.white, fontWeight: "bold" }}>Înapoi</Text>
                </TouchableOpacity>
            </View>
        );
    }

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
                            {title || "Titlu necunoscut"}
                        </Text>
                    </View>
                </View>

                <View style={{ padding: Spacing.lg, gap: Spacing.xxl }}>
                    {tipPagina !== "Facultate" && tipPagina !== "Facilitate" && (
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
                            <Text style={[Typography.Heading4, { color: theme.text }]}>
                                Informații eveniment
                            </Text>

                            <View style={{ gap: Spacing.md }}>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.md }}>
                                    <CalendarIcon width={24} height={24} color={theme.primary} />
                                    <View>
                                        <Text style={[Typography.Heading5, { color: theme.text }]}>
                                            De pe {date_start || "Dată de început necunoscută"} {time_start || ""}
                                        </Text>
                                        <Text style={[Typography.Heading5, { color: theme.text }]}>
                                            Până la {date_end || "Dată de sfârșit necunoscută"} {time_end || ""}
                                        </Text>
                                    </View>
                                </View>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.md }}>
                                    <LocationIcon width={24} height={24} color={theme.primary} />
                                    <View>
                                        <Text style={[Typography.Heading5, { color: theme.text }]}>
                                            {location || "Locație necunoscută"}
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
                            {content || "Conținut necunoscut"}
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

export default VizualizareScreen;
