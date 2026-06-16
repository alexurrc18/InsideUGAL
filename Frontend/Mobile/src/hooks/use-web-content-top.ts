import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Spacing, WebContentMaxWidth, WebMaxScale } from "@/constants/theme";
import { NAVBAR_HEIGHT } from "@/components/ui/navigation/web-navbar";

/**
 * Padding-ul de sus pentru paginile web cu navbar fix (overlay).
 *
 * Navbar-ul e pozitionat absolut peste continut, deci fiecare pagina trebuie sa
 * lase loc sub el. Pe ecrane late navbar-ul e scalat cu `zoom` (vezi
 * WebContainer), asa ca tinem cont de zoom — astfel TOATE paginile pornesc de la
 * aceeasi inaltime sub navbar (acelasi top ca pagina Hartă), nu de la o valoare
 * fixa nimerita la intamplare.
 *
 * Fisier folosit doar din pagini .web.tsx => nu intra in bundle-ul de mobil.
 */
export function useWebContentTop() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scaling = width > WebContentMaxWidth;
  const zoom = scaling ? Math.min(width / WebContentMaxWidth, WebMaxScale) : 1;
  return insets.top + NAVBAR_HEIGHT * zoom + Spacing.xl;
}
