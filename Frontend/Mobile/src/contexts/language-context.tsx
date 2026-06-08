import { createContext, useContext, useState, type ReactNode } from "react";
import type { Lang } from "@/i18n/translations";

interface LanguageContextValue {
  lang: Lang;
  toggleLanguage: () => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

/**
 * Sursa de adevar pentru limba (DOAR web). Porneste din romana.
 * Alegerea nu e salvata intre restarturi (deocamdata).
 * Importat exclusiv din fisiere .web — mobilul nu il atinge.
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("ro");
  const toggleLanguage = () => setLang((l) => (l === "ro" ? "en" : "ro"));

  return (
    <LanguageContext.Provider value={{ lang, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

/** Pentru buton: arunca daca nu e provider. */
export function useLanguageContext() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguageContext trebuie folosit în interiorul <LanguageProvider>");
  }
  return ctx;
}

/** Varianta sigura (null daca nu exista provider) — folosita de t(). */
export function useOptionalLanguageContext() {
  return useContext(LanguageContext);
}
