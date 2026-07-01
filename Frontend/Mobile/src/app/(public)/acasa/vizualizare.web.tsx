import { useState, useEffect } from "react";
import { View, Text, ScrollView, Linking, TouchableOpacity, useWindowDimensions, StyleSheet, type LayoutChangeEvent, ActivityIndicator } from "react-native";
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
import api from "@/services/api";
import { useTranslation } from 'react-i18next';
import { ErrorState } from "@/components/ui/display/error-state";

import CalendarIcon from "@/assets/icons/svg/calendar.svg";
import LocationIcon from "@/assets/icons/svg/location.svg";
import PhoneIcon from "@/assets/icons/svg/phone.svg";
import WebsiteIcon from "@/assets/icons/svg/globe-europe.svg";

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

// Latimea coloanei din dreapta (sidebar) cand layout-ul e pe doua coloane.
const SIDEBAR_WIDTH = 340;
// Sub acest prag continutul si sidebarul se stivuiesc vertical.
const TWO_COL_BREAKPOINT = 900;

function VizualizareScreen() {
    const params = useLocalSearchParams();
    const id = params.id as string;
    const { t, i18n } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [retryKey, setRetryKey] = useState(0);

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
    const [facilityPool, setFacilityPool] = useState<any[]>([]);

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
            if (initialTipPagina === "Facilitate") {
                try {
                    const res = await api.get('/facilities/', { params: { page: 1, size: 50 } });
                    if (res.data?.items && isMounted) setFacilityPool(res.data.items);
                } catch (err) {
                    console.warn('[API] Error loading related facilities:', err);
                }
            } else {
                try {
                    const res = await api.get('/announcements/', { params: { page: 1, size: 20, lang: i18n.language } });
                    if (res.data?.items && isMounted) setRelatedPool(res.data.items);
                } catch (err) {
                    console.warn('[API] Error loading related announcements:', err);
                }
            }
        };

        const loadData = async () => {
            if (!id) {
                setLoading(false);
                return;
            }
            if (isMounted) setHasError(false);

            loadRelated();

            try {
                let fetchedItem: any = null;
                const numericId = parseInt(id);
                const isNumeric = !isNaN(numericId);

                if (isNumeric) {
                    try {
                        if (initialTipPagina === "Eveniment" || initialTipPagina === "Anunț") {
                            const res = await api.get(`/announcements/${numericId}`, { params: { lang: i18n.language } });
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
                                    posted_at: isoToRomanianDateStr(item.created_at) || "",
                                    date: isoToRomanianDateStr(item.start_date) || t('common.unknownDate'),
                                    author: item.author_name || "",
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
                                    title: item.name || t('common.unknownTitle'),
                                    image: item.image_url || "",
                                    address: item.address || t('common.unknownAddress'),
                                    phone: item.phone || "",
                                    website: item.website_url || "",
                                    content: item.description || t('common.unknownContent'),
                                };
                            }
                        } else if (initialTipPagina === "Facilitate") {
                            const res = await api.get(`/facilities/${numericId}`);
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
                    } catch (apiErr) {
                        console.warn("[API] Could not fetch details:", apiErr);
                    }
                }

                if (isMounted) {
                    setItemData(fetchedItem);
                    if (!fetchedItem) setHasError(true);
                    setLoading(false);
                }
            } catch (err) {
                console.error("[Loader] Error loading detail page:", err);
                if (isMounted) { setHasError(true); setLoading(false); }
            }
        };

        loadData();
        return () => {
            isMounted = false;
        };
    }, [id, initialTipPagina, retryKey, i18n.language]);

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

    // Anunturi inrudite: prioritizam aceeasi categorie ca articolul curent, apoi
    // completam cu restul. Excludem articolul curent (dupa titlu). Sidebar-ul ia
    // primele, "Mai multe" ia urmatoarele (distincte de sidebar).
    const pool = relatedPool
        .filter((item: any) => item.title !== title)
        .map((item: any) => ({
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
            posted_at: isoToRomanianDateStr(item.created_at) || "",
            date: isoToRomanianDateStr(item.start_date) || t('common.unknownDate'),
            author: item.author_name || "",
            created_at: item.created_at,
            updated_at: item.updated_at,
        }));
    // Dreapta (Articole similare): doar articole din aceeași categorie ca cel curent
    const sameCategory = pool.filter((e) => e.category === (category as string));
    const sidebarItems = sameCategory.slice(0, 3);

    // Jos (Mai multe): ultimele trei articole (anunțuri/evenimente) postate
    const sortedByDate = [...pool].sort((a, b) => {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return timeB - timeA;
    });
    const relatedItems = sortedByDate.slice(0, 3);

    const relatedFacilities = facilityPool
        .filter((f: any) => f.id !== parseInt(id))
        .slice(0, 3)
        .map((f: any) => ({
            id: f.id.toString(),
            title: f.name || t('common.unknownTitle'),
            image: f.image_url || "",
        }));

    // Latimea masurata a randului de jos, impartita egal la numarul de carduri.
    const [rowWidth, setRowWidth] = useState(0);
    const onRowLayout = (e: LayoutChangeEvent) => setRowWidth(e.nativeEvent.layout.width);
    const bottomItems = tipPagina === "Facilitate" ? relatedFacilities : relatedItems;
    const bottomCount = bottomItems.length;
    const bottomCardWidth =
        rowWidth > 0 && bottomCount > 0 ? (rowWidth - (bottomCount - 1) * Spacing.lg) / bottomCount : 0;

    // Navigare catre alt anunt (aceeasi pagina, parametri noi).
    const openItem = (item: any) => {
        router.push({
            pathname: "/(public)/acasa/vizualizare",
            params: {
                id: item.id,
                type: item.category === t('home.events') ? "Eveniment" : "Anunț",
            },
        });
    };

    const handleCall = () => {
        if (window.confirm(t('detail.callConfirm', { phone }))) {
            Linking.openURL(`tel:${phone}`);
        }
    };

    const displayDateValue = category === t('home.news')
        ? (posted_at && posted_at !== t('common.unknownDate') ? posted_at : "")
        : (date && date !== t('common.unknownDate') ? date : posted_at);

    const formattedDate = getFormattedDate(displayDateValue as string);
    const readingTime = getReadingTime(content as string);
    const dateDisplay = category === t('home.news') ? (formattedDate ? `${formattedDate} | ${readingTime}` : t('common.unknownDate')) : (formattedDate || t('common.unknownDate'));

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

    if (hasError || !itemData) {
        return (
            <View style={{ flex: 1, backgroundColor: theme.background, justifyContent: "center", alignItems: "center", padding: Spacing.xl, height: 400 }}>
                <ErrorState 
                    message={t('detail.notFound')}
                    onRetry={() => setRetryKey(prev => prev + 1)} 
                />
            </View>
        );
    }

    // Breadcrumbs: Acasă / [categorie sau tip] / [titlu]. Segmentul de categorie
    // duce la lista categoriei respective; ultimul (titlul) nu e clickabil.
    const crumbCategory = (category as string) || (tipPagina as string);
    const TIP_LABELS: Record<string, string> = {
        "Facultate": t('common.faculty'),
        "Facilitate": t('common.facility'),
    };
    const crumbLabel = TIP_LABELS[crumbCategory] || crumbCategory;
    const crumbs: Crumb[] = [
        { label: t('common.home'), href: "/(public)/acasa" },
        ...(crumbCategory
            ? [{ label: crumbLabel, href: `/(public)/acasa/categorie?title=${encodeURIComponent(crumbCategory)}` }]
            : []),
        { label: (title as string) || t('common.unknownTitle') },
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
            <Seo title={(title as string) || t('common.article')} description={seoDescription}>
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
                                    {category || TIP_LABELS[tipPagina] || t('common.category')}
                                </Text>
                            )}
                            <Text
                                accessibilityRole="header"
                                {...({ "aria-level": 1 } as any)}
                                style={[Typography.Heading2, { color: ColorScheme.white }]}
                            >
                                {title || t('common.unknownTitle')}
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
                                    <Text style={[Typography.Heading4, { color: theme.text, fontFamily: "InstrumentSans-SemiBold", fontWeight: "600" }]}>{t('detail.eventInfo')}</Text>
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
                                                    {location || t('common.unknownLocation')}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            )}

                            {tipPagina === "Facultate" && (
                                <View style={{ gap: Spacing.md }}>
                                    <Text style={[Typography.Heading4, { color: theme.text }]}>{t('detail.contact')}</Text>
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
                                                        <Text style={[Typography.Heading5, { color: theme.text }]}>{phone}</Text>
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
                                                        <Text style={[Typography.Heading5, { color: theme.secondary }]}>{website}</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            )}

                            {tipPagina === "Facilitate" && formatSchedules(itemData?.schedules || [], t).length > 0 && (
                                <View style={{ gap: Spacing.md }}>
                                    <Text style={[Typography.Heading4, { color: theme.text, fontFamily: "InstrumentSans-SemiBold", fontWeight: "600" }]}>
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
                                <Text style={[Typography.Heading4, { color: theme.text, fontFamily: "InstrumentSans-SemiBold", fontWeight: "600" }]}>
                                    {tipPagina === "Eveniment" ? t('detail.aboutEvent') : tipPagina === "Facultate" ? t('detail.aboutFaculty') : tipPagina === "Facilitate" ? t('detail.aboutFacility') : t('detail.details')}
                                </Text>
                                <Text style={[Typography.Paragraph2, { color: theme.text, lineHeight: 25 }]}>
                                    {content || t('common.unknownContent')}
                                </Text>
                            </View>
                        </View>

                        {/* Dreapta: 3 carduri Noutăți, una sub alta. */}
                        {sidebarItems.length > 0 && (
                            <View style={{ width: twoCol ? SIDEBAR_WIDTH : "100%", gap: Spacing.lg }}>
                                <Text style={[Typography.Heading2, { color: theme.text }]}>{t('detail.relatedArticles')}</Text>
                                {sidebarItems.map((item) => (
                                    <CompactCard key={item.id} item={item} onPress={() => openItem(item)} />
                                ))}
                            </View>
                        )}
                    </View>

                    {/* Jos, sub tot: 3 carduri pe un rand. */}
                    {bottomItems.length > 0 && (
                        <View style={{ gap: Spacing.lg, marginTop: Spacing.xl3 }}>
                            <Text style={[Typography.Heading2, { color: theme.text }]}>{t('detail.more')}</Text>
                            <View style={{ flexDirection: "row", gap: Spacing.lg }} onLayout={onRowLayout}>
                                {bottomCardWidth > 0 && bottomItems.map((item: any) => (
                                    tipPagina === "Facilitate" ? (
                                        <NewsCard
                                            key={item.id}
                                            width={bottomCardWidth}
                                            title={item.title}
                                            image={item.image}
                                            onPress={() => router.push({ pathname: "/(public)/acasa/vizualizare", params: { id: item.id, type: "Facilitate" } } as any)}
                                        />
                                    ) : (
                                        <NewsCard
                                            key={item.id}
                                            width={bottomCardWidth}
                                            title={item.title}
                                            date={getFormattedDate(item.date_start || item.date)}
                                            author={item.author}
                                            image={item.image}
                                            category={item.category}
                                            onPress={() => openItem(item)}
                                        />
                                    )
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
