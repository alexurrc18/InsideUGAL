import { useState, useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Seo } from "@/components/seo";
import { ArticleDetail } from "@/components/ui/display/article-detail";
import { ErrorState } from "@/components/ui/display/error-state";
import { parseEventId, allEventParams } from "@/utils/article-url";
import api from "@/services/api";
import { isoToRomanianDateStr } from "@/utils/date";
import { Colors, Spacing } from "@/constants/theme";
import { useTranslation } from "react-i18next";

// Pre-generează paginile la build
export function generateStaticParams() {
    return allEventParams();
}

export default function EvenimentScreen() {
    const { t } = useTranslation();
    const params = useLocalSearchParams();
    const id = parseEventId(params.id);
    const [ev, setEv] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [retryKey, setRetryKey] = useState(0);

    const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
    const theme = Colors[themeName];

    useEffect(() => {
        const run = async () => {
            if (!id) {
                setHasError(true);
                setLoading(false);
                return;
            }
            setHasError(false);
            setLoading(true);
            try {
                const res = await api.get(`/announcements/${id}`);
                setEv(res.data);
            } catch (err) {
                console.warn("[EvenimentScreen] Error loading event:", err);
                setHasError(true);
            } finally {
                setLoading(false);
            }
        };
        run();
    }, [id, retryKey]);

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: theme.background, justifyContent: "center", alignItems: "center", height: 400 }}>
                <ActivityIndicator size="large" color={theme.primary} />
            </View>
        );
    }

    if (hasError || !ev) {
        return (
            <View style={{ flex: 1, backgroundColor: theme.background, justifyContent: "center", alignItems: "center", padding: Spacing.xl, height: 400 }}>
                <ErrorState
                    message="Detaliile nu au putut fi găsite."
                    onRetry={() => setRetryKey(k => k + 1)}
                />
            </View>
        );
    }

    const title = ev.title || "Eveniment";
    const content = ev.content || "";
    const image = ev.image_url || "";
    const location = ev.location_name || "";
    const date_start = isoToRomanianDateStr(ev.start_date) || "";
    const date_end = isoToRomanianDateStr(ev.end_date) || "";
    const time_start = ev.start_date ? new Date(ev.start_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
    const time_end = ev.end_date ? new Date(ev.end_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
    const date = date_start || isoToRomanianDateStr(ev.created_at) || "";

    const seoDescription = content.slice(0, 160) || `${title} — InsideUGAL`;

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Event",
        name: title,
        ...(date_start ? { startDate: date_start } : {}),
        ...(date_end ? { endDate: date_end } : {}),
        ...(location ? { location: { "@type": "Place", name: location } } : {}),
        ...(image ? { image: [image] } : {}),
        ...(content ? { description: content } : {}),
    };

    return (
        <>
            <Seo title={title} description={seoDescription}>
                <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
            </Seo>
            <ArticleDetail
                type="Eveniment"
                title={title}
                category={t('home.events')}
                content={content}
                image={image}
                location={location}
                date_start={date_start}
                date_end={date_end}
                time_start={time_start}
                time_end={time_end}
                date={date}
                files={ev.files || []}
            />
        </>
    );
}
