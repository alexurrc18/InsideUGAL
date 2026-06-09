import React from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { WebContentMaxWidth, WebSidePadding } from "@/constants/theme";

/**
 * Container web partajat (.web.tsx — mobilul NU il foloseste).
 *
 * Centreaza continutul si ii aplica o latime maxima (WebContentMaxWidth),
 * pastrand o margine laterala constanta (WebSidePadding).
 *
 * - Pe ecrane late: coloana se opreste din crescut, marginile laterale cresc.
 *   Elementele raman la acelasi size (nu se intind, nu se micsoreaza).
 * - Pe ecrane inguste: coloana se ingusteaza odata cu fereastra, pastrand
 *   marginea laterala.
 *
 * Lograrea (latime/margine) e definita aici, intr-un singur loc.
 *
 * @param padded - daca false, nu aplica marginea laterala (ex: continut care
 *   isi gestioneaza singur padding-ul). Implicit true.
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
  return (
    <View
      style={[
        {
          width: "100%",
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
