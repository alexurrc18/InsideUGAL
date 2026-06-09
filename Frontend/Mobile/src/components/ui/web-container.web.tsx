import React, { useEffect, useRef } from "react";
import { View, useWindowDimensions, type StyleProp, type ViewStyle } from "react-native";
import { WebContentMaxWidth, WebMaxScale, WebSidePadding } from "@/constants/theme";

/**
 * Canvas-ul de continut pe web (.web.tsx — mobilul NU il foloseste).
 *
 * Comportament in functie de latimea ferestrei, raportat la baseline-ul
 * WebContentMaxWidth (1100):
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
  const ref = useRef<View>(null);

  const scaling = width > WebContentMaxWidth;
  const zoom = scaling ? Math.min(width / WebContentMaxWidth, WebMaxScale) : 1;

  // `zoom` nu e o proprietate de stil React Native, deci o setam direct pe nodul
  // DOM (suntem pe web, View randeaza un <div>).
  useEffect(() => {
    const node = ref.current as unknown as HTMLElement | null;
    if (node) {
      node.style.zoom = String(zoom);
    }
  }, [zoom]);

  return (
    <View
      ref={ref}
      style={[
        {
          width: scaling ? WebContentMaxWidth : "100%",
          maxWidth: WebContentMaxWidth,
          alignSelf: "center",
          paddingHorizontal: padded ? WebSidePadding : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
