// UI-ul paginii de detaliu (eveniment / anunt / facultate / facilitate), extras
// din vizualizare.web.tsx ca sa poata fi REUTILIZAT de mai multe rute.
//
// Componenta e "prostuta": primeste datele ca props si doar le afiseaza. Nu citeste
// parametri din URL si nu seteaza SEO — astea raman in fisierul de ruta, ca fiecare
// ruta sa-si poata alege singura titlul/descrierea/JSON-LD-ul.
//
// Folosita doar din fisiere web (.web.tsx), deci nu intra in bundle-ul de mobil.
import { useState, useEffect } from "react";
import { View, Text, ScrollView, Linking, TouchableOpacity, useWindowDimensions, StyleSheet, type LayoutChangeEvent } from "react-native";
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
import { useTranslation } from "react-i18next";
import { CompactCard } from "@/components/ui/display/home-highlights";
import { NewsCard, CategoryTag } from "@/components/ui/display/news-card";
import { eventHref, anuntHref } from "@/utils/article-url";
import api from "@/services/api";

import CalendarIcon from "@/assets/icons/svg/calendar.svg";
import LocationIcon from "@/assets/icons/svg/location.svg";
import PhoneIcon from "@/assets/icons/svg/phone.svg";
import WebsiteIcon from "@/assets/icons/svg/globe-europe.svg";
import { FileAttachments, type FileItem } from "@/components/ui/display/file-attachment";

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
    author?: string;
    files?: FileItem[];
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
    author = "",
    files,
}: ArticleDetailProps) {
    const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
    const theme = Colors[themeName];
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { width } = useWindowDimensions();
    const { t, i18n } = useTranslation();
    const twoCol = width >= TWO_COL_BREAKPOINT;

    const tipPagina = type || "Eveniment";

    const [relatedPool, setRelatedPool] = useState<any[]>([]);

    useEffect(() => {
        let isMounted = true;
        const loadRelated = async () => {
            try {
                const res = await api.get('/announcements/', { params: { page: 1, size: 20, lang: i18n.language } });
                if (res.data?.items && isMounted) {
                    setRelatedPool(res.data.items);
                }
            } catch (err) {
                console.warn('[ArticleDetail] Error loading related announcements:', err);
            }
        };
        loadRelated();
        return () => {
            isMounted = false;
        };
    }, [i18n.language]);

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
    const sameCategory = pool.filter((e) => e.category === category);
    const sidebarItems = sameCategory.slice(0, 3);

    // Jos (Mai multe): ultimele trei articole (anunțuri/evenimente) postate
    const sortedByDate = [...pool].sort((a, b) => {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return timeB - timeA;
    });
    const relatedItems = sortedByDate.slice(0, 3);

    // Latimea masurata a randului de jos, impartita egal la numarul de carduri.
    const [rowWidth, setRowWidth] = useState(0);
    const onRowLayout = (e: LayoutChangeEvent) => setRowWidth(e.nativeEvent.layout.width);
    const bottomCount = relatedItems.length;
    const bottomCardWidth =
        rowWidth > 0 && bottomCount > 0 ? (rowWidth - (bottomCount - 1) * Spacing.lg) / bottomCount : 0;

    // Navigare catre alt articol. Evenimentele si anunturile au URL curat.
    const openItem = (item: any) => {
        if (item.category === t('home.events')) {
            router.push(eventHref(item) as any);
            return;
        }
        if (item.category === t('home.news')) {
            router.push(anuntHref(item) as any);
            return;
        }
        router.push({
            pathname: "/(public)/acasa/vizualizare",
            params: {
                type: item.category === t('home.events') ? "Eveniment" : "Anunț",
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
        if (window.confirm(t('detail.callConfirm', { phone }))) {
            Linking.openURL(`tel:${phone}`);
        }
    };

    const formattedDate = getFormattedDate(date || posted_at);
    const readingTime = getReadingTime(content);
    const dateDisplay = category === t('home.news') ? `${formattedDate} | ${readingTime}` : formattedDate;

    // Breadcrumbs: Acasă / [categorie sau tip] / [titlu]. Segmentul de categorie
    // duce la lista categoriei respective; ultimul (titlul) nu e clickabil.
    const crumbCategory = category || tipPagina;
    const crumbs: Crumb[] = [
        { label: t('common.home'), href: "/(public)/acasa" },
        ...(crumbCategory
            ? [{ label: crumbCategory === "Evenimente" ? t('home.events') : crumbCategory === "Noutăți" ? t('home.news') : crumbCategory === "Facultăți" ? t('home.faculties') : crumbCategory === "Facilități" ? t('home.facilities') : crumbCategory, href: `/(public)/acasa/categorie?title=${encodeURIComponent(crumbCategory)}` }]
            : []),
        { label: title || t('common.article') },
    ];

    return (
        <View style={{ flex: 1, backgroundColor: theme.background }}>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + Spacing.xl }}>
                {/* Banner full-bleed: ramane pe toata latimea, in afara canvas-ului scalat */}
                <View style={{ width: "100%", height: 320 }}>
                    <Image
                        source={image ? { uri: image } : require("@/assets/images/campus-stiintei.png")}
                        accessibilityLabel={title || t('common.article')}
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
                                    {category || (tipPagina === "Facultate" ? t('common.faculty') : t('common.category'))}
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
                            {tipPagina !== "Facultate" && (
                                <Text style={[Typography.Paragraph3, { color: theme.textSecondary }]}>
                                    {[dateDisplay, author].filter(Boolean).join("  ·  ") || t('common.unknownDate')}
                                </Text>
                            )}

                            {tipPagina === "Eveniment" && (
                                <View style={{ gap: Spacing.md }}>
                                    <Text style={[Typography.Heading4, { color: theme.text, fontFamily: "InstrumentSans-SemiBold", fontWeight: "600" }]}>{t('detail.eventInfo')}</Text>
                                    <View style={{ gap: Spacing.md }}>
                                        <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.md }}>
                                            <CalendarIcon width={24} height={24} color={theme.primary} />
                                            <View>
                                                <Text style={[Typography.Heading5, { color: theme.text }]}>
                                                    {t('detail.from')} {date_start || "N/A"} {time_start || ""}
                                                </Text>
                                                <Text style={[Typography.Heading5, { color: theme.text }]}>
                                                    {t('detail.until')} {date_end || "N/A"} {time_end || ""}
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
                                                    <TouchableOpacity onPress={() => Linking.openURL(website)}>
                                                        <Text style={[Typography.Heading5, { color: theme.secondary }]}>{website}</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            )}

                            <View style={{ gap: Spacing.md }}>
                                <Text style={[Typography.Heading4, { color: theme.text, fontFamily: "InstrumentSans-SemiBold", fontWeight: "600" }]}>
                                    {tipPagina === "Eveniment" ? t('detail.aboutEvent') : tipPagina === "Facultate" ? t('detail.aboutFaculty') : t('detail.details')}
                                </Text>
                                <Text style={[Typography.Paragraph2, { color: theme.text, lineHeight: 25 }]}>
                                    {content || t('common.unknownContent')}
                                </Text>
                            </View>

                            {(tipPagina === "Anunț" || tipPagina === "Eveniment") && (
                                <FileAttachments files={files} />
                            )}
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
                    {relatedItems.length > 0 && (
                        <View style={{ gap: Spacing.lg }}>
                            <Text style={[Typography.Heading2, { color: theme.text }]}>{t('detail.more')}</Text>
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
                                            category={item.category}
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
