// Helper pentru URL-urile "curate" ale articolelor (evenimente).
//
// Forma hibrida: /eveniment/<id>-<slug> (ex. /eveniment/2-gala-studentilor-ugal-2026).
// - id-ul (partea dinainte de prima cratima) e canonic — dupa el cautam datele;
// - slug-ul e doar decorativ, pentru SEO si lizibilitate.

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

// Cauta un eveniment dupa id — datele vin din backend via API.
export function findEventById(_id: string): any {
  return null;
}

// Parametrii de pre-generat la build — se intoarce [] pana cand backend-ul
// expune un endpoint de listare pentru generateStaticParams.
export function allEventParams(): { id: string }[] {
  return [];
}

// ── Anunturi (Noutati) — aceeasi logica, alta categorie ──────────────────────────
export function anuntHref(item: { id: string; title: string }): string {
  const slug = slugify(item.title);
  return `/(public)/anunt/${item.id}${slug ? `-${slug}` : ''}`;
}

export function allAnuntParams(): { id: string }[] {
  return [];
}
