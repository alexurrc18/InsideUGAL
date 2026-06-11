// Context DOAR pentru web. Rolul lui: sa transmita navbar-ului (montat ca overlay
// in (public)/_layout.web.tsx) cat de mult a derulat pagina curenta.
//
// De ce e nevoie de el: scroll-ul se intampla in interiorul ScrollView-ului
// fiecarei pagini, nu in fereastra browserului. Navbar-ul, fiind un frate
// (sibling) al paginilor in layout, nu are de unde sa "vada" pozitia scroll-ului
// daca pagina nu i-o raporteaza. Asa ca fiecare pagina cheama useWebScrollAware()
// si paseaza rezultatul pe ScrollView; navbar-ul citeste doar `scrolled`.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

interface WebScrollContextValue {
  /** true cand pagina curenta a fost derulata peste pragul ei (banner trecut). */
  scrolled: boolean;
  setScrolled: (value: boolean) => void;
}

const WebScrollContext = createContext<WebScrollContextValue | null>(null);

export function WebScrollProvider({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  const value = useMemo(() => ({ scrolled, setScrolled }), [scrolled]);
  return <WebScrollContext.Provider value={value}>{children}</WebScrollContext.Provider>;
}

function useWebScroll(): WebScrollContextValue {
  const ctx = useContext(WebScrollContext);
  if (!ctx) {
    // Fallback inofensiv: daca o pagina foloseste hook-ul fara provider (nu ar
    // trebui pe web), nu crapam — navbar-ul ramane pur si simplu transparent.
    return { scrolled: false, setScrolled: () => {} };
  }
  return ctx;
}

/** Pe care navbar-ul se bazeaza ca sa-si schimbe fundalul. */
export function useNavbarScrolled(): boolean {
  return useWebScroll().scrolled;
}

/**
 * Hook pentru paginile web: intoarce props de pus direct pe <ScrollView>.
 * Cand pozitia verticala trece de `threshold`, marcheaza pagina ca "scrolled"
 * (navbar-ul capata fundal). La montare reseteaza starea, ca o pagina noua sa
 * porneasca mereu cu navbar transparent.
 *
 * @param threshold inaltimea (px) dupa care navbar-ul devine solid. Pe pagini cu
 *   banner mare (Acasa) e mai mare; pe paginile fara banner, mic.
 */
export function useWebScrollAware(threshold = 80) {
  const { scrolled, setScrolled } = useWebScroll();

  useEffect(() => {
    setScrolled(false);
    // Resetam doar la (re)montare / schimbarea pragului.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threshold]);

  const onScroll = useCallback(
    (e: { nativeEvent: { contentOffset: { y: number } } }) => {
      const past = e.nativeEvent.contentOffset.y > threshold;
      // Setam doar la schimbarea de prag, nu la fiecare pixel.
      if (past !== scrolled) setScrolled(past);
    },
    [threshold, scrolled, setScrolled]
  );

  return { onScroll, scrollEventThrottle: 16 };
}
