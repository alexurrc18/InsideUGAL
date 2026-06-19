// Ruta de detaliu pe web. E "subtire": citeste datele (din parametrii URL sau, dupa
// id, din mock-data), seteaza SEO-ul (titlu/descriere/JSON-LD) si paseaza datele
// catre <ArticleDetail>, care se ocupa de tot UI-ul. Asa, ruta noua /eveniment/[id]
// poate refolosi acelasi <ArticleDetail> schimband doar cum obtine datele + SEO-ul.
import { useLocalSearchParams } from "expo-router";
import { Seo } from "@/components/seo";
import { ArticleDetail } from "@/components/ui/display/article-detail";
import MOCK_DATA from "@/constants/mock-data.json";

function VizualizareScreen() {
    const params = useLocalSearchParams();
    const id = params.id as string;

    let mockItem: any = null;
    if (id) {
        mockItem = MOCK_DATA.events.find(e => e.id === id) ||
                   MOCK_DATA.faculties.find(f => f.id === id) ||
                   MOCK_DATA.facilities.find(fac => fac.id === id);
    }

    const type = (params.type as string) || (mockItem ? (mockItem.id.startsWith("fac") ? "Facilitate" : mockItem.id.startsWith("f") ? "Facultate" : (mockItem.category === "Evenimente" ? "Eveniment" : "Anunț")) : undefined);
    const title = (params.title as string) || mockItem?.title || "";
    const category = (params.category as string) || mockItem?.category || (mockItem ? (mockItem.id.startsWith("fac") ? "Facilitate" : mockItem.id.startsWith("f") ? "Facultate" : "") : "");
    const content = (params.content as string) || mockItem?.content || "";
    const image = (params.image as string) || mockItem?.image || "";
    const location = (params.location as string) || mockItem?.location || "";
    const date_start = (params.date_start as string) || mockItem?.date_start || "";
    const date_end = (params.date_end as string) || mockItem?.date_end || "";
    const time_start = (params.time_start as string) || mockItem?.time_start || "";
    const time_end = (params.time_end as string) || mockItem?.time_end || "";
    const posted_at = (params.posted_at as string) || mockItem?.posted_at || "";
    const address = (params.address as string) || mockItem?.address || "";
    const phone = (params.phone as string) || mockItem?.phone || "";
    const website = (params.website as string) || mockItem?.website || "";
    const date = (params.date as string) || mockItem?.date || "";

    const tipPagina = type || "Eveniment";

    // Descriere SEO din continut (primele ~160 caractere).
    const seoDescription = content.slice(0, 160) || `${title} — InsideUGAL`;

    // Date structurate schema.org pentru rezultate imbogatite in Google:
    //   - Eveniment -> Event (cu data/loc), Anunt -> NewsArticle.
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
        <>
            <Seo title={title || "Articol"} description={seoDescription}>
                {jsonLd ? (
                    <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
                ) : null}
            </Seo>
            <ArticleDetail
                type={type}
                title={title}
                category={category}
                content={content}
                image={image}
                location={location}
                date_start={date_start}
                date_end={date_end}
                time_start={time_start}
                time_end={time_end}
                posted_at={posted_at}
                address={address}
                phone={phone}
                website={website}
                date={date}
            />
        </>
    );
}

export default VizualizareScreen;
