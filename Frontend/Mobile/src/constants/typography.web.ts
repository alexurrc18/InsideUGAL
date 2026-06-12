// Typography DOAR pentru WEB.
//
// Metro alege automat acest fisier in locul lui `typography.ts` cand bundle-ul e
// pentru web (pattern-ul "platform-specific modules": orice import de
// `@/constants/typography` din cod web ajunge aici, iar mobile-ul foloseste mai
// departe `typography.ts` — neatins).
//
// Pe web vrem un aspect mai aerisit: ierarhia se face din MARIMI (pastrate identic
// cu mobile-ul), iar GREUTATEA e scoasa cat se poate:
//   - Heading1..Heading4 (titluri mari de pagina/sectiune) -> Regular (400)
//   - Heading5 (navbar + etichete + butoane)               -> Medium (500)
//   - Heading6 (titluri de carduri)                        -> Medium (500)
// Restul (Paragraph*, Small*) raman identice cu mobile-ul.
//
// Exceptie: titlul mare din Hero/banner ramane Bold, ingrosat local in
// components/ui/hero-slideshow.tsx (e singurul titlu boldat de pe web).
//
// Fonturile sunt deja incarcate pe web in app/_layout.web.tsx.
export const Typography = {
  Heading1: { fontSize: 39, fontFamily: "InstrumentSans-Regular", fontWeight: "400" as const },
  Heading2: { fontSize: 31, fontFamily: "InstrumentSans-Regular", fontWeight: "400" as const },
  Heading3: { fontSize: 25, fontFamily: "InstrumentSans-Regular", fontWeight: "400" as const },
  Heading4: { fontSize: 20, fontFamily: "InstrumentSans-Regular", fontWeight: "400" as const },
  Heading5: { fontSize: 16, fontFamily: "InstrumentSans-Medium", fontWeight: "500" as const },
  Heading6: { fontSize: 16, fontFamily: "InstrumentSans-Medium", fontWeight: "500" as const },

  Paragraph1: { fontSize: 20, fontFamily: "InstrumentSans-Regular", fontWeight: "400" as const },
  Paragraph2: { fontSize: 16, fontFamily: "InstrumentSans-Regular", fontWeight: "400" as const },
  Paragraph3: { fontSize: 13, fontFamily: "InstrumentSans-Regular", fontWeight: "400" as const },
  Paragraph4: { fontSize: 10, fontFamily: "InstrumentSans-Regular", fontWeight: "400" as const },

  Small1: { fontSize: 13, fontFamily: "InstrumentSans-Medium", fontWeight: "500" as const },
  Small2: { fontSize: 10, fontFamily: "InstrumentSans-Medium", fontWeight: "500" as const },
};
