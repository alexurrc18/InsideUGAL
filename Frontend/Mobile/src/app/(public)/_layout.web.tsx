// Layout (public) DOAR pentru web. Mobilul foloseste _layout.tsx (neatins).
//
// Pe web inlocuim bara de jos (NativeTabs, ca pe mobil) cu un navbar de sus
// custom: logo stanga + link-uri/tema dreapta. Navbar-ul e un overlay fix peste
// continut; fiecare pagina deruleaza in propriul ScrollView si raporteaza
// pozitia prin WebScrollProvider, ca navbar-ul sa stie cand sa capete fundal.
import { Stack } from "expo-router";
import { View } from "react-native";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { WebScrollProvider } from "@/contexts/web-scroll-context";
import { WebNavbar } from "@/components/ui/navigation/web-navbar";
// import { Ace } from "@/components/ui/layout/ace";

export default function PublicWebLayout() {
  const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
  const theme = Colors[themeName];

  // ThemeProvider e montat in root-ul web (_layout.web.tsx), deasupra tuturor grupurilor.
  return (
    <WebScrollProvider>
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <Stack screenOptions={{ headerShown: false, animation: "none" }} />
        {/* Navbar randat dupa Stack => sta deasupra (overlay fix in capul paginii). */}
        <WebNavbar />
        {/* Widget-ul ACE: bulina flotanta jos-dreapta + panou de chat. Montat aici
            (deasupra Stack-ului) => persista la navigarea intre paginile (public). */}
        {/* <Ace /> */}
      </View>
    </WebScrollProvider>
  );
}
