// Helper pentru URL-urile "curate" ale articolelor (evenimente).
//
// Forma hibrida: /eveniment/<id>-<slug> (ex. /eveniment/2-gala-studentilor-ugal-2026).
// - id-ul (partea dinainte de prima cratima) e canonic — dupa el cautam datele;
// - slug-ul e doar decorativ, pentru SEO si lizibilitate.
//
// Momentan datele vin din mock-data.json; cand vine backend-ul, schimbi doar
// `findEventById` / `allEventParams` ca sa intrebe API-ul.
import MOCK_DATA from '@/constants/mock-data.json';

// "Gala Studenților UGAL 2026" -> "gala-studentilor-ugal-2026"
export function slugify(input: string): string {
  return (input || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // scoate diacriticele (decompuse de NFD)
    .replace(/[^a-z0-9]+/g, '-') // tot ce nu e litera/cifra -> "-"
    .replace(/^-+|-+$/g, ''); // curata "-" de la capete
}

// Construieste calea catre pagina unui eveniment.
export function eventHref(item: { id: string; title: string }): string {
  const slug = slugify(item.title);
  return `/(public)/eveniment/${item.id}${slug ? `-${slug}` : ''}`;
}

// Extrage id-ul din segmentul de ruta "<id>-<slug>" (sau direct "<id>").
export function parseEventId(param: string | string[] | undefined): string {
  const raw = Array.isArray(param) ? param[0] : param ?? '';
  return raw.split('-')[0];
}

// Cauta un eveniment dupa id (acum din mock; mai tarziu din backend).
export function findEventById(id: string): any {
  return MOCK_DATA.events.find((e) => e.id === id) ?? null;
}

// Toate segmentele [id] de pre-generat la build (doar evenimentele, nu si anunturile).
export function allEventParams(): { id: string }[] {
  return MOCK_DATA.events
    .filter((e) => e.category === 'Evenimente')
    .map((e) => ({ id: `${e.id}-${slugify(e.title)}` }));
}

// ── Anunturi (Noutati) — aceeasi logica, alta categorie ──────────────────────────
// Lookup-ul e acelasi `findEventById` (anunturile sunt tot in array-ul `events`).
export function anuntHref(item: { id: string; title: string }): string {
  const slug = slugify(item.title);
  return `/(public)/anunt/${item.id}${slug ? `-${slug}` : ''}`;
}

export function allAnuntParams(): { id: string }[] {
  return MOCK_DATA.events
    .filter((e) => e.category === 'Noutăți')
    .map((e) => ({ id: `${e.id}-${slugify(e.title)}` }));
}
