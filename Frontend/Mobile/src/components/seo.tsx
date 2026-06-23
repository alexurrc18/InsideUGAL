// Componenta <Seo>: seteaza <title> + <meta name="description"> per pagina,
// pentru SEO. Foloseste `expo-router/head`, care pe web injecteaza in <head>, iar
// pe mobil e un no-op (deci e sigura si in fisiere shared / rulate pe ambele).
//
// `children` permite adaugarea de elemente suplimentare in <head> de catre pagina
// (ex. date structurate JSON-LD pentru evenimente).
import Head from 'expo-router/head';
import { usePathname } from 'expo-router';
import { type ReactNode } from 'react';

const SITE_NAME = 'InsideUGAL';
// Domeniul de productie (actualizeaza-l daca difera). Folosit pentru URL-ul canonic.
const SITE_URL = 'https://insideugal.ro';

interface SeoProps {
  /** Titlul paginii. I se adauga automat " — InsideUGAL", daca nu e deja inclus. */
  title: string;
  description?: string;
  children?: ReactNode;
}

export function Seo({ title, description, children }: SeoProps) {
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} — ${SITE_NAME}`;

  // URL canonic = domeniu + calea curenta (fara grupul "(public)"). Spune Google
  // care e adresa "oficiala" a paginii, ca sa nu o considere continut duplicat
  // (ex. /eveniment/2 vs /(public)/eveniment/2).
  const pathname = usePathname();
  const canonical = `${SITE_URL}${pathname === '/' ? '' : pathname}`;

  return (
    <Head>
      <title>{fullTitle}</title>
      {description ? <meta name="description" content={description} /> : null}
      <link rel="canonical" href={canonical} />
      {children}
    </Head>
  );
}
