// Componenta <Seo>: seteaza <title> + <meta name="description"> per pagina,
// pentru SEO. Foloseste `expo-router/head`, care pe web injecteaza in <head>, iar
// pe mobil e un no-op (deci e sigura si in fisiere shared / rulate pe ambele).
//
// `children` permite adaugarea de elemente suplimentare in <head> de catre pagina
// (ex. date structurate JSON-LD pentru evenimente).
import Head from 'expo-router/head';
import { type ReactNode } from 'react';

const SITE_NAME = 'InsideUGAL';

interface SeoProps {
  /** Titlul paginii. I se adauga automat " — InsideUGAL", daca nu e deja inclus. */
  title: string;
  description?: string;
  children?: ReactNode;
}

export function Seo({ title, description, children }: SeoProps) {
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} — ${SITE_NAME}`;

  return (
    <Head>
      <title>{fullTitle}</title>
      {description ? <meta name="description" content={description} /> : null}
      {children}
    </Head>
  );
}
