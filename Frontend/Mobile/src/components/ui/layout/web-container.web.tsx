import React from "react";
import { View, useWindowDimensions, type StyleProp, type ViewStyle } from "react-native";
import { WebContentMaxWidth, WebSidePadding, Spacing } from "@/constants/theme";

// Sub aceasta latime suntem "pe telefon" (browser ingust): marginile laterale
// se micsoreaza mult, ca sa nu irosim jumatate din ecran pe padding.
export const WEB_COMPACT_BREAKPOINT = 768;

/**
 * Canvas-ul de continut pe web (.web.tsx — mobilul NU il foloseste).
 *
 * Comportament in functie de latimea ferestrei, raportat la baseline-ul
 * WebContentMaxWidth (1200):
 *  - sub baseline: layout fluid normal, fara zoom. Continutul umple latimea
 *    (cu margine laterala WebSidePadding). Textul NU se micsoreaza.
 *  - peste baseline: continutul e fixat la latimea de baseline si tot ce e
 *    inauntru scaleaza proportional cu fereastra printr-un `zoom` CSS
 *    (elementele cresc uniform), plafonat la WebMaxScale. Peste plafon raman
 *    centrate si cresc doar marginile.
 *
 * Folosim `zoom` (nu `transform: scale`) pentru ca refloweaza corect: fara text
 * blurry, fara scrollbar orizontal, iar ScrollView-ul masoara inaltimea reala.
 *
 * Fiecare pagina web ar trebui sa aiba EXACT un WebContainer care infasoara tot
 * continutul scrollabil, ca scalarea sa fie uniforma.
 *
 * @param padded - aplica marginea laterala WebSidePadding (implicit true). Pune
 *   false cand continutul are elemente full-bleed (ex: imagine hero) si isi
 *   gestioneaza singur padding-ul pe blocurile interioare.
 */
export function WebContainer({
  children,
  style,
  padded = true,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}) {
  const { width } = useWindowDimensions();

  const scaling = width > WebContentMaxWidth;

  // Margine laterala responsiva: mica pe telefon, generoasa pe ecran lat.
  const sidePadding = width < WEB_COMPACT_BREAKPOINT ? Math.min(Spacing.lg, WebSidePadding) : WebSidePadding;

  return (
    <View
      style={[
        {
          width: scaling ? WebContentMaxWidth : "100%",
          maxWidth: WebContentMaxWidth,
          alignSelf: "center",
          paddingHorizontal: padded ? sidePadding : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
