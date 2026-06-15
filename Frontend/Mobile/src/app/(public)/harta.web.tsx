// Varianta web a paginii Harta. Mobilul foloseste harta.tsx (neatins).
//
// Provocarea de aliniere: navbar-ul isi aliniaza continutul printr-un WebContainer
// care, peste 1200px, aplica un `zoom` CSS (scaleaza tot continutul). Harta NU
// poate fi pusa intr-un WebContainer — `zoom`-ul ar deforma/innegura randarea
// MapLibre. Asa ca reproducem in JS exact inset-ul orizontal al navbar-ului
// (aceeasi geometrie ca WebContainer) si il aplicam ca padding simplu, fara zoom.
// Rezultat: harta si antetul se aliniaza cu navbar-ul la orice latime, harta
// ramane clara, si umple inaltimea ramasa.
import { useState, useMemo, useCallback } from "react";
import { View, useWindowDimensions } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Colors,
  Spacing,
  WebContentMaxWidth,
  WebMaxScale,
  WebSidePadding,
} from "@/constants/theme";
import Map from "@/components/map";
import { CategoryHeader } from "@/components/ui/category-header";
import { WebContainer, WEB_COMPACT_BREAKPOINT } from "@/components/ui/web-container";
import { useWebContentTop } from "@/hooks/use-web-content-top";
import MockData from "@/constants/mock-data.json";

export default function HartaScreen() {
  const [selectedFacultyId, setSelectedFacultyId] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
  const theme = Colors[themeName];
  const contentTop = useWebContentTop();

  // Geometria WebContainer-ului (vezi web-container.web.tsx), reprodusa ca valori.
  const scaling = width > WebContentMaxWidth;
  const zoom = scaling ? Math.min(width / WebContentMaxWidth, WebMaxScale) : 1;
  const columnWidth = scaling ? WebContentMaxWidth * zoom : width;
  // Padding-ul lateral al WebContainer-ului e responsiv (mic pe ecran ingust), deci
  // il reproducem identic aici ca harta sa ramana aliniata cu titlul "Hartă".
  const sidePadding = width < WEB_COMPACT_BREAKPOINT ? Math.min(Spacing.lg, WebSidePadding) : WebSidePadding;
  // Inset-ul orizontal pana la continutul navbarului (logo / "Hartă"):
  //   margine de centrare + (padding lateral + Spacing.lg) scalate cu zoom.
  const contentInset = (width - columnWidth) / 2 + (sidePadding + Spacing.lg) * zoom;

  const facultyFilters = useMemo(
    () => [
      { id: null, title: "Toate locațiile" },
      { id: "f8", title: "Facilități" },
      ...MockData.faculties.map((f) => ({ id: f.id, title: f.title })),
    ],
    []
  );

  const handleSelectFilter = useCallback((id: string | null) => {
    setSelectedFacultyId((prev) => (prev === id ? null : id));
  }, []);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.background,
        // Lasam loc sub navbar (acelasi top ca celelalte pagini web).
        paddingTop: contentTop,
      }}
    >
      {/* Header in WebContainer => acelasi zoom ca pe cantina/sesizari, deci titlul
          "Hartă" are aceeasi marime ca "Cantina"/"Sesizări". Harta ramane in afara. */}
      <WebContainer>
        <CategoryHeader
          title="Hartă"
          filters={facultyFilters}
          selectedFilterId={selectedFacultyId}
          onSelectFilter={handleSelectFilter}
        />
      </WebContainer>

      {/* Harta umple inaltimea ramasa; padding lateral = inset-ul navbarului. */}
      <View
        style={{
          flex: 1,
          paddingHorizontal: contentInset,
          paddingBottom: insets.bottom + Spacing.lg,
          marginTop: Spacing.md,
        }}
      >
        <Map themeName={themeName} selectedFacultyId={selectedFacultyId} onFacultySelect={setSelectedFacultyId} />
      </View>
    </View>
  );
}
