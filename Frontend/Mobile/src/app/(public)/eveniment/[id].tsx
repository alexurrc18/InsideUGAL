// Varianta de BAZA a rutei /eveniment/[id] (Expo cere un fisier non-platforma ca
// sa inregistreze ruta). UI-ul web bogat sta in [id].web.tsx; aici, pe mobil (si ca
// fallback), redirectionam catre ecranul de detaliu existent, pasand doar id-ul —
// asa nu schimbam comportamentul aplicatiei native.
import { Redirect, useLocalSearchParams } from "expo-router";
import { parseEventId, allEventParams } from "@/utils/article-url";

// Acelasi set de pagini pre-generate ca varianta web (siguranta pentru static export).
export function generateStaticParams() {
    return allEventParams();
}

export default function EvenimentRedirect() {
    const params = useLocalSearchParams();
    const id = parseEventId(params.id);
    return <Redirect href={`/(public)/acasa/vizualizare?id=${id}` as any} />;
}
