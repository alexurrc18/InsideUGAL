// Ruta de detaliu pentru ANUNTURI (Noutati) pe web, cu URL curat: /anunt/<id>-<slug>.
// Acelasi tipar ca eveniment/[id].web.tsx, dar cu JSON-LD de tip NewsArticle.
import { useLocalSearchParams } from "expo-router";
import { Seo } from "@/components/seo";
import { ArticleDetail } from "@/components/ui/display/article-detail";
import { parseEventId, findEventById, allAnuntParams } from "@/utils/article-url";

// Pre-genereaza cate o pagina HTML pentru fiecare anunt (SEO la build).
export function generateStaticParams() {
    return allAnuntParams();
}

export default function AnuntScreen() {
    const params = useLocalSearchParams();
    const id = parseEventId(params.id);
    const item: any = findEventById(id);

    const title = item?.title || "Anunț";
    const content = item?.content || "";
    const image = item?.image || "";
    const date = item?.date || "";
    const posted_at = item?.posted_at || "";

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
                category={item?.category || "Noutăți"}
                content={content}
                image={image}
                date={date}
                posted_at={posted_at}
            />
        </>
    );
}
