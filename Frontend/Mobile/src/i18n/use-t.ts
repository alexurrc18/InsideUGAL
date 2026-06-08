// Hook de traducere (DOAR web). Foloseste limba din LanguageContext.
// t("cheie") -> textul in limba curenta; daca lipseste cheia, intoarce cheia
// (asa vezi imediat ce n-ai tradus, fara sa crape).
import { translations } from "@/i18n/translations";
import { useOptionalLanguageContext } from "@/contexts/language-context";

export function useT() {
  const ctx = useOptionalLanguageContext();
  const lang = ctx?.lang ?? "ro";
  return (key: string) => translations[key]?.[lang] ?? key;
}
