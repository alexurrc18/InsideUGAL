import { useColorScheme } from "@/hooks/use-color-scheme";
import { useState, useEffect, useRef } from "react";
import { View, Text, ScrollView, Linking, TouchableOpacity, Alert, StyleSheet, Platform, useWindowDimensions, InteractionManager, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, ColorScheme, Spacing } from "@/constants/theme";
import { Typography } from "@/constants/typography";
import { getFormattedDate, getReadingTime, isoToRomanianDateStr } from "@/utils/date";
import api, { storage } from "@/services/api";
import { useTranslation } from 'react-i18next';
import { VizualizareSkeleton } from "@/components/ui/display/skeletons";
import { ErrorState } from "@/components/ui/display/error-state";

import CalendarIcon from "@/assets/icons/svg/calendar.svg";
import LocationIcon from "@/assets/icons/svg/location.svg";
import PhoneIcon from "@/assets/icons/svg/phone.svg";
import WebsiteIcon from "@/assets/icons/svg/globe-europe.svg";
import { CategoryTag } from "@/components/ui/display/news-card";
import BackIcon from "@/assets/icons/svg/chevron-left.svg";

function formatSchedules(schedules: any[], t: (key: string) => string): string[] {
    if (!schedules || schedules.length === 0) return [];
    const sorted = [...schedules].sort((a, b) => a.day_of_week - b.day_of_week);
    const groups: string[] = [];
    let i = 0;
    while (i < sorted.length) {
        const start = sorted[i];
        let j = i + 1;
        while (
            j < sorted.length &&
            sorted[j].day_of_week === sorted[j - 1].day_of_week + 1 &&
            sorted[j].open_time === start.open_time &&
            sorted[j].close_time === start.close_time
        ) { j++; }
        const end = sorted[j - 1];
        const timeRange = `${start.open_time.slice(0, 5)} - ${start.close_time.slice(0, 5)}`;
        groups.push(
            j - i === 1
                ? `${t(`days.${start.day_of_week}`)}: ${timeRange}`
                : `${t(`days.${start.day_of_week}`)} - ${t(`days.${end.day_of_week}`)}: ${timeRange}`
        );
        i = j;
    }
    return groups;
}

function VizualizareScreen() {
    const params = useLocalSearchParams();
    const id = params.id as string;
    const router = useRouter();
    const { width } = useWindowDimensions();
    const { t, i18n } = useTranslation();
    const [scrolledPast, setScrolledPast] = useState(false);
    const [loading, setLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [retryKey, setRetryKey] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const refreshStartRef = useRef(0);
    const [imgErr, setImgErr] = useState(false);

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
            if (isMounted) { setHasError(false); setLoading(true); }

            // Defer load until transition finishes so navigation is instant and lag-free
            interactionTask = InteractionManager.runAfterInteractions(async () => {
                try {
                    let fetchedItem: any = null;
                    const numericId = parseInt(id);
                    const isNumeric = !isNaN(numericId);

                    if (isNumeric) {
                        if (initialTipPagina === "Eveniment" || initialTipPagina === "Anunț") {
                            const res = await api.get(`/announcements/${numericId}`, { params: { lang: i18n.language, include_untranslated: true } });
                            if (res.data) {
                                const item = res.data;
                                fetchedItem = {
                                    id: item.id.toString(),
                                    type: item.type === "NOUTATE" ? "Anunț" : "Eveniment",
                                    title: (i18n.language !== 'ro' && item.is_translated ? item.translated_title : null) || item.title || t('common.unknownTitle'),
                                    category: item.type === "NOUTATE" ? t('home.news') : t('home.events'),
                                    content: (i18n.language !== 'ro' && item.is_translated ? item.translated_content : null) || item.content || t('common.unknownContent'),
                                    image: item.image_url || "",
                                    location: item.location_name || t('common.unknownLocation'),
                                    date_start: isoToRomanianDateStr(item.start_date) || "",
                                    date_end: isoToRomanianDateStr(item.end_date) || "",
                                    time_start: item.start_date ? new Date(item.start_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
                                    time_end: item.end_date ? new Date(item.end_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
                                    posted_at: item.created_at || "",
                                    date: item.start_date || "",
                                    author: item.author_name || "",
                                    created_at: item.created_at,
                                    updated_at: item.updated_at,
                                };
                            }
                        } else if (initialTipPagina === "Facultate") {
                            const res = await api.get(`/faculties/${numericId}`, { params: { lang: i18n.language } });
                            if (res.data) {
                                const item = res.data;
                                fetchedItem = {
                                    id: item.id.toString(),
                                    type: "Facultate",
                                    title: item.name || t('common.unknownTitle'),
                                    image: item.logo_url || "",
                                    address: item.address || t('common.unknownAddress'),
                                    phone: item.phone || "",
                                    website: item.website_url || "",
                                    content: item.description || t('common.unknownContent'),
                                };
                            }
                        } else if (initialTipPagina === "Facilitate") {
                            const res = await api.get(`/facilities/${numericId}`, { params: { lang: i18n.language } });
                            if (res.data) {
                                const item = res.data;
                                fetchedItem = {
                                    id: item.id.toString(),
                                    type: "Facilitate",
                                    title: item.name || t('common.unknownTitle'),
                                    image: item.image_url || "",
                                    content: item.description || "",
                                    schedules: item.schedules || [],
                                };
                            }
                        }
                    }

                    if (isMounted) {
                        setItemData(fetchedItem);
                        if (!fetchedItem) setHasError(true);
                        setLoading(false);
                    }
                } catch (err) {
                    console.warn("[API] Could not fetch details:", err);
                    try {
                        const isFaculty = initialTipPagina === "Facultate";
                        const isFacility = initialTipPagina === "Facilitate";
                        const cacheKey = isFaculty ? 'cached_faculties' : isFacility ? 'cached_ugal_facilities' : 'cached_announcements';
                        const cachedStr = await storage.getItem(cacheKey);
                        if (cachedStr) {
                            const cachedItems = JSON.parse(cachedStr);
                            const numericId = parseInt(id);
                            const match = cachedItems.find((item: any) => item.id === numericId || item.id?.toString() === id);
                            if (match && isMounted) {
                                let mappedItem: any = null;
                                if (isFaculty) {
                                    mappedItem = { id: match.id.toString(), type: "Facultate", title: match.name || t('common.unknownTitle'), image: match.logo_url || "", address: match.address || t('common.unknownAddress'), phone: match.phone || "", website: match.website_url || "", content: match.description || t('common.unknownContent') };
                                } else if (isFacility) {
                                    mappedItem = { id: match.id.toString(), type: "Facilitate", title: match.name || t('common.unknownTitle'), image: match.image_url || "", content: match.description || "", schedules: match.schedules || [] };
                                } else {
                                    mappedItem = { id: match.id.toString(), type: match.type === "NOUTATE" ? "Anunț" : "Eveniment", title: (i18n.language !== 'ro' && match.is_translated ? match.translated_title : null) || match.title || t('common.unknownTitle'), category: match.type === "NOUTATE" ? t('home.news') : t('home.events'), content: (i18n.language !== 'ro' && match.is_translated ? match.translated_content : null) || match.content || t('common.unknownContent'), image: match.image_url || "", location: match.location_name || t('common.unknownLocation'), date_start: match.start_date || "", date_end: match.end_date || "", time_start: match.start_date ? new Date(match.start_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "", time_end: match.end_date ? new Date(match.end_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "", posted_at: match.created_at || "", date: match.start_date || "", author: match.author_name || "", created_at: match.created_at, updated_at: match.updated_at };
                                }
                                setItemData(mappedItem);
                                setLoading(false);
                                return;
                            }
                        }
                    } catch {}
                    if (isMounted) { setHasError(true); setLoading(false); }
                }
            });
        };

        loadData();
        return () => {
            isMounted = false;
            if (interactionTask) {
                interactionTask.cancel();
            }
        };
    }, [id, initialTipPagina, retryKey, i18n.language, t]);

    const onRefresh = () => {
        setRefreshing(true);
        setItemData(null);
        refreshStartRef.current = Date.now();
        setRetryKey(prev => prev + 1);
    };

    useEffect(() => {
        if (!refreshing || loading) return;
        const elapsed = Date.now() - refreshStartRef.current;
        const delay = Math.max(0, 1000 - elapsed);
        const timer = setTimeout(() => setRefreshing(false), delay);
        return () => clearTimeout(timer);
    }, [loading, refreshing]);

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
    const date = itemData?.date || "";

    const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
    const theme = Colors[themeName];
    const insets = useSafeAreaInsets();

    const handleCall = () => {
        Alert.alert(
            tipPagina === "Facultate" ? t('detail.callFaculty') : t('detail.callFacility'),
            t('detail.callConfirm', { phone }),
            [
                { text: t('detail.cancel'), style: "cancel" },
                { text: t('detail.call'), onPress: () => Linking.openURL(`tel:${phone}`) }
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
    const formattedUpdateDate = itemData?.updated_at ? getFormattedDate(itemData.updated_at) : "";

    if (loading && !itemData) {
        return (
            <View style={{ flex: 1, backgroundColor: theme.background }}>
                <VizualizareSkeleton />
            </View>
        );
    }

    if (hasError || !itemData) {
        return (
            <View style={{ flex: 1, backgroundColor: theme.background }}>
                <Stack.Screen
                    options={{
                        headerShown: true,
                        headerTransparent: false,
                        headerStyle: { backgroundColor: theme.background },
                        headerShadowVisible: false,
                        headerTitle: "",
                        headerLeft: () => (
                            <TouchableOpacity onPress={() => router.back()} style={{ padding: Spacing.xs, marginLeft: Spacing.md }}>
                                <BackIcon width={28} height={28} color={theme.text} />
                            </TouchableOpacity>
                        ),
                    }}
                />
                <ErrorState 
                    message={t('detail.loadError')}
                    onRetry={() => setRetryKey(prev => prev + 1)}
                />
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
                    headerTitle: scrolledPast ? (title || t('detail.details')) : "",
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
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} />
                }
            >
                <View style={{ width: "100%", height: 320 }}>
                    <Image
                        source={image && !imgErr ? { uri: image as string } : require("@/assets/images/campus-stiintei.png")}
                        onError={() => setImgErr(true)}
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
                                {category || (tipPagina === "Facultate" ? t('common.faculty') : tipPagina === "Facilitate" ? t('common.facility') : t('common.category'))}
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
                                {[dateDisplay, itemData?.author].filter(Boolean).join("  ·  ")}
                            </Text>
                            {isUpdated && formattedUpdateDate ? (
                                <Text style={[Typography.Paragraph3, { color: theme.textSecondary }]}>
                                    {t('detail.updated')} {formattedUpdateDate}
                                </Text>
                            ) : null}
                        </View>
                    )}
                    
                    {tipPagina === "Eveniment" && (
                        <View style={{ gap: Spacing.md }}>
                            <Text style={[Typography.Heading4, { color: theme.text }]}>
                                {t('detail.eventInfo')}
                            </Text>

                            <View style={{ gap: Spacing.md }}>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.md }}>
                                    <CalendarIcon width={24} height={24} color={theme.primary} />
                                    <View>
                                        <Text style={[Typography.Heading5, { color: theme.text }]}>
                                            {t('detail.from')} {date_start || t('common.unknownStartDate')} {time_start || ""}
                                        </Text>
                                        <Text style={[Typography.Heading5, { color: theme.text }]}>
                                            {t('detail.until')} {date_end || t('common.unknownEndDate')} {time_end || ""}
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

                    {tipPagina === "Facultate" && (
                        <View style={{ gap: Spacing.md }}>
                            <Text style={[Typography.Heading4, { color: theme.text }]}>
                                {t('detail.contact')}
                            </Text>

                            <View style={{ gap: Spacing.lg }}>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.md }}>
                                    <LocationIcon width={24} height={24} color={theme.primary} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={[Typography.Paragraph3, { color: theme.textSecondary }]}>{t('detail.address')}</Text>
                                        <Text style={[Typography.Heading5, { color: theme.text }]}>
                                            {address || t('common.unknownAddress')}
                                        </Text>
                                    </View>
                                </View>

                                {phone && (
                                    <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.md }}>
                                        <PhoneIcon width={24} height={24} color={theme.primary} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={[Typography.Paragraph3, { color: theme.textSecondary }]}>{t('detail.phone')}</Text>
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
                                            <Text style={[Typography.Paragraph3, { color: theme.textSecondary }]}>{t('detail.website')}</Text>
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

                    {tipPagina === "Facilitate" && formatSchedules(itemData?.schedules || [], t).length > 0 && (
                        <View style={{ gap: Spacing.md }}>
                            <Text style={[Typography.Heading4, { color: theme.text }]}>
                                {t('detail.facilityInfo')}
                            </Text>
                            <View style={{ gap: Spacing.md }}>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.md }}>
                                    <CalendarIcon width={24} height={24} color={theme.primary} />
                                    <View>
                                        <Text style={[Typography.Paragraph3, { color: theme.textSecondary }]}>{t('detail.schedule')}</Text>
                                        {formatSchedules(itemData.schedules, t).map((line: string, i: number) => (
                                            <Text key={i} style={[Typography.Heading5, { color: theme.text }]}>{line}</Text>
                                        ))}
                                    </View>
                                </View>
                            </View>
                        </View>
                    )}

                    <View style={{ gap: Spacing.md }}>
                        <Text style={[Typography.Heading4, { color: theme.text }]}>
                            {tipPagina === "Eveniment" ? t('detail.aboutEvent') : tipPagina === "Facultate" ? t('detail.aboutFaculty') : tipPagina === "Facilitate" ? t('detail.aboutFacility') : t('detail.details')}
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
