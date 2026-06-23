// Ruta de detaliu pentru EVENIMENTE pe web, cu URL curat: /eveniment/<id>-<slug>.
//
// E "subtire" (la fel ca vizualizare.web.tsx): cauta evenimentul dupa id, seteaza
// SEO-ul (titlu/descriere/JSON-LD) si paseaza datele catre <ArticleDetail>, care
// face tot UI-ul. `generateStaticParams` spune build-ului ce pagini sa pre-genereze
// (acum din mock; cand vine backend-ul, schimbi doar `allEventParams`).
import { useLocalSearchParams } from "expo-router";
import { Seo } from "@/components/seo";
import { ArticleDetail } from "@/components/ui/display/article-detail";
import { parseEventId, findEventById, allEventParams } from "@/utils/article-url";

// Pre-genereaza cate o pagina HTML pentru fiecare eveniment (SEO la build).
export function generateStaticParams() {
    return allEventParams();
}

export default function EvenimentScreen() {
    const params = useLocalSearchParams();
    const id = parseEventId(params.id);
    const ev: any = findEventById(id);

    const title = ev?.title || "Eveniment";
    const content = ev?.content || "";
    const image = ev?.image || "";
    const location = ev?.location || "";
    const date_start = ev?.date_start || "";
    const date_end = ev?.date_end || "";
    const time_start = ev?.time_start || "";
    const time_end = ev?.time_end || "";
    const date = ev?.date_start || ev?.date || "";

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
                category={ev?.category || "Evenimente"}
                content={content}
                image={image}
                location={location}
                date_start={date_start}
                date_end={date_end}
                time_start={time_start}
                time_end={time_end}
                date={date}
            />
        </>
    );
}
