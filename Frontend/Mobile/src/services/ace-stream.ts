// Streaming-ul raspunsului asistentului ACE (web).
//
// Chat-ul merge DIRECT la serviciul LLM (NU prin gateway-ul din backend principal —
// acela e pus de forma si nu functioneaza, conform echipei LLM):
//   POST {LLM_BASE_URL}/api/v1/campus-chat/stream   body: { question, history }
// Baza vine din config (EXPO_PUBLIC_LLM_BASE_URL) — se schimba acolo, nu aici.
// Raspunsul e text/event-stream cu linii:
//   data: {"content":"...","cached":false}   -> token
//   data: {"error":"..."}                     -> eroare
//   data: [DONE]                              -> final
//
// Fiind POST cu body, NU putem folosi `EventSource` (acela e doar GET). Folosim
// `fetch` + cititorul de stream (`response.body.getReader()`) si parsam SSE manual.
// Asa putem trimite si header-ul `Authorization` (endpoint-ul cere autentificare).
import { Config } from '@/constants/config';
import { getAuthToken } from '@/services/api';

const STREAM_URL = `${Config.LLM_BASE_URL}/api/v1/campus-chat/stream`;

export interface AceHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

export interface AceStreamCallbacks {
  /** Apelat pentru fiecare fragment de text primit. */
  onToken: (chunk: string) => void;
  /** Apelat o singura data, la finalul cu succes al stream-ului. */
  onDone: () => void;
  /** Apelat la orice eroare (retea, server, anulare logica). */
  onError: (message: string) => void;
}

/**
 * Porneste streaming-ul raspunsului. Intoarce o functie de OPRIRE pe care o chemi
 * pentru cleanup (la demontare, la inchiderea panoului, sau cand userul trimite alt
 * mesaj). Oprirea NU declanseaza `onError`.
 */
export function streamAce(
  question: string,
  history: AceHistoryItem[],
  { onToken, onDone, onError }: AceStreamCallbacks
): () => void {
  const controller = new AbortController();

  (async () => {
    try {
      const token = await getAuthToken();

      const res = await fetch(STREAM_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        // NOTA: forma exacta a lui `history` (role/content) e de confirmat cu
        // echipa LLM; daca difera, se schimba doar aici.
        body: JSON.stringify({ question, history }),
        signal: controller.signal,
      });

      if (!res.ok) {
        onError(
          res.status === 429
            ? 'Prea multe întrebări într-un timp scurt. Încearcă din nou în câteva momente.'
            : res.status === 401
              ? 'Trebuie să fii autentificat pentru a folosi asistentul.'
              : 'Asistentul nu este disponibil momentan. Încearcă mai târziu.'
        );
        return;
      }
      if (!res.body) {
        onError('Nu am putut citi răspunsul de la asistent.');
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      // Citim raspunsul SSE bucata cu bucata. Acumulam intr-un buffer si procesam
      // linie cu linie; ultima linie poate fi incompleta -> o pastram in buffer.
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;

          const payload = trimmed.slice('data:'.length).trim();
          if (!payload) continue;

          if (payload === '[DONE]') {
            onDone();
            return;
          }

          try {
            const data = JSON.parse(payload);
            if (data.error) {
              onError(typeof data.error === 'string' ? data.error : 'Eroare la asistent.');
              return;
            }
            if (typeof data.content === 'string' && data.content.length > 0) {
              onToken(data.content);
            }
          } catch {
            // Linie care nu e JSON valid (ex. comentariu SSE) — o ignoram.
          }
        }
      }

      // Stream inchis fara [DONE] explicit — tot consideram ca s-a terminat.
      onDone();
    } catch (err: any) {
      // Anulare intentionata (cleanup) — nu e o eroare reala.
      if (err?.name === 'AbortError') return;
      onError('Conexiune întreruptă. Verifică rețeaua și încearcă din nou.');
    }
  })();

  return () => controller.abort();
}
