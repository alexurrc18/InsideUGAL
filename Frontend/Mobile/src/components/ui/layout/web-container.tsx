import React from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";

// Tinut sincronizat cu web-container.web.tsx (exista aici doar pentru rezolvarea
// de tipuri pe non-web; varianta reala folosita e cea din .web.tsx).
export const WEB_COMPACT_BREAKPOINT = 768;

/**
 * Varianta de baza (native) a WebContainer.
 *
 * Implementarea reala (centrare + latime maxima) este in web-container.web.tsx
 * si e folosita DOAR pe web. Pe mobil nu exista nevoia de coloana centrata, deci
 * acest fisier e un simplu passthrough — randeaza copiii fara constrangeri.
 *
 * Exista doar ca sa respecte conventia .tsx + .web.tsx si pentru rezolvarea de
 * tipuri (TypeScript). In practica e referit doar din fisiere .web.tsx, care pe
 * mobil nu sunt incluse in bundle.
 */
export function WebContainer({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}) {
  return <View style={style}>{children}</View>;
}
