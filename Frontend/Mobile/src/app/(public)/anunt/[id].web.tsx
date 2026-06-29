import { useState, useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Seo } from "@/components/seo";
import { ArticleDetail } from "@/components/ui/display/article-detail";
import { ErrorState } from "@/components/ui/display/error-state";
import { parseEventId, allAnuntParams } from "@/utils/article-url";
import api from "@/services/api";
import { isoToRomanianDateStr } from "@/utils/date";
import { Colors, Spacing } from "@/constants/theme";

// Pre-generează paginile la build
export function generateStaticParams() {
    return allAnuntParams();
}

export default function AnuntScreen() {
    const params = useLocalSearchParams();
    const id = parseEventId(params.id);
    const [item, setItem] = useState<any>(null);
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
                setItem(res.data);
            } catch (err) {
                console.warn("[AnuntScreen] Error loading announcement:", err);
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

    if (hasError || !item) {
        return (
            <View style={{ flex: 1, backgroundColor: theme.background, justifyContent: "center", alignItems: "center", padding: Spacing.xl, height: 400 }}>
                <ErrorState
                    message="Detaliile nu au putut fi găsite."
                    onRetry={() => setRetryKey(k => k + 1)}
                />
            </View>
        );
    }

    const title = item.title || "Anunț";
    const content = item.content || "";
    const image = item.image_url || "";
    const date = isoToRomanianDateStr(item.created_at) || "";
    const author = item.author_name || "";
    const seoDescription = content.slice(0, 160) || `${title} — InsideUGAL`;

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        headline: title,
        ...(image ? { image: [image] } : {}),
        ...(content ? { articleBody: content } : {}),
    };

    return (
        <>
            <Seo title={title} description={seoDescription}>
                <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
            </Seo>
            <ArticleDetail
                type="Anunț"
                title={title}
                category="Noutăți"
                content={content}
                image={image}
                date={date}
                posted_at={date}
                author={author}
            />
        </>
    );
}
