// Layout pentru grupul "acasa" — DOAR web. Mobilul foloseste _layout.tsx (neatins),
// care pune headere de Stack (cu buton inapoi) pe categorie/vizualizare.
//
// Pe web NU vrem acele headere de Stack: navigarea o face WebNavbar-ul (overlay
// montat in (public)/_layout.web.tsx), iar pe paginile de continut exista
// breadcrumbs. Un header de Stack peste asta ar fi spatiu mort si s-ar bate cap cu
// navbar-ul (continut impins prea jos, navbar acoperit). Asa ca aici toate
// sub-paginile acasa sunt fara header.
import { Stack } from "expo-router";

export const unstable_settings = {
  initialRouteName: "index",
};

export default function AcasaWebLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: "none" }} />;
}
