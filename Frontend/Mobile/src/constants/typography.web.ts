// Typography DOAR pentru WEB.
//
// Metro alege automat acest fisier in locul lui `typography.ts` cand bundle-ul e
// pentru web (pattern-ul "platform-specific modules": orice import de
// `@/constants/typography` din cod web ajunge aici, iar mobile-ul foloseste mai
// departe `typography.ts` — neatins).
//
// Scala e calibrata pentru DESKTOP (densitate vizuala de tip site de stiri):
// dimensiuni mai mici si ierarhie clara din greutate (Bold -> SemiBold -> Medium).
// Mobile-ul (phone) ramane pe scala mai mare din typography.ts.
//
// Fonturile sunt deja incarcate pe web in app/_layout.web.tsx.
export const Typography = {
  Heading1: { fontSize: 26, fontFamily: "InstrumentSans-Bold", fontWeight: "700" as const },
  Heading2: { fontSize: 22, fontFamily: "InstrumentSans-Bold", fontWeight: "700" as const },
  Heading3: { fontSize: 19, fontFamily: "InstrumentSans-SemiBold", fontWeight: "600" as const },
  Heading4: { fontSize: 16, fontFamily: "InstrumentSans-SemiBold", fontWeight: "600" as const },
  Heading5: { fontSize: 13, fontFamily: "InstrumentSans-Medium", fontWeight: "500" as const },
  Heading6: { fontSize: 10, fontFamily: "InstrumentSans-Medium", fontWeight: "500" as const },

  Paragraph1: { fontSize: 18, fontFamily: "InstrumentSans-Regular", fontWeight: "400" as const },
  Paragraph2: { fontSize: 16, fontFamily: "InstrumentSans-Regular", fontWeight: "400" as const },
  Paragraph3: { fontSize: 14, fontFamily: "InstrumentSans-Regular", fontWeight: "400" as const },
  Paragraph4: { fontSize: 12, fontFamily: "InstrumentSans-Regular", fontWeight: "400" as const },

  Small1: { fontSize: 14, fontFamily: "InstrumentSans-Medium", fontWeight: "500" as const },
  Small2: { fontSize: 12, fontFamily: "InstrumentSans-Medium", fontWeight: "500" as const },
};
