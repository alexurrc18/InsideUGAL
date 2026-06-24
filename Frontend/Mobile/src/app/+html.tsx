// Documentul HTML radacina pentru export-ul WEB static (Expo Router).
// Ruleaza DOAR la build-ul de web — nu intra in bundle-ul de mobil.
//
// Aici setam `lang="ro"` (limba paginii, pentru SEO si cititoare de ecran) si o
// descriere implicita. Paginile individuale isi pun titlu/descriere proprii prin
// componenta <Seo> (expo-router/head), care le suprascriu pe acestea.
import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="ro">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta
          name="description"
          content="InsideUGAL — anunțuri, evenimente, cantină și hartă pentru studenții Universității „Dunărea de Jos” din Galați."
        />

        {/* Reset recomandat de Expo pentru ca ScrollView-urile sa se comporte corect pe web. */}
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
