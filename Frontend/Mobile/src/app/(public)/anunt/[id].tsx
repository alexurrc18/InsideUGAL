// Varianta de BAZA a rutei /anunt/[id] (Expo cere un fisier non-platforma ca sa
// inregistreze ruta). UI-ul web sta in [id].web.tsx; aici, pe mobil (si ca fallback),
// redirectionam catre ecranul de detaliu existent, pasand doar id-ul.
import { Redirect, useLocalSearchParams } from "expo-router";
import { parseEventId, allAnuntParams } from "@/utils/article-url";

// Acelasi set de pagini pre-generate ca varianta web (siguranta pentru static export).
export function generateStaticParams() {
    return allAnuntParams();
}

export default function AnuntRedirect() {
    const params = useLocalSearchParams();
    const id = parseEventId(params.id);
    return <Redirect href={`/(public)/acasa/vizualizare?id=${id}` as any} />;
}
