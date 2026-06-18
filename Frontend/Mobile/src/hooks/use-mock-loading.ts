import { useEffect, useState } from 'react';

// Hook temporar care SIMULEAZA o incarcare asincrona, ca sa putem vedea
// skeleton-urile cat timp inca folosim date din `mock-data.json` (care sunt
// instant, deci altfel skeleton-ul n-ar aparea niciodata).
//
// CAND VINE BACKEND-UL: stergi acest hook din pagina si il inlocuiesti cu starea
// reala de incarcare. Exemplu cu fetch simplu:
//
//   const [loading, setLoading] = useState(true);
//   const [data, setData] = useState([]);
//   useEffect(() => {
//     fetch(URL).then(r => r.json()).then(setData).finally(() => setLoading(false));
//   }, []);
//
// ...sau, daca folositi React Query / SWR, `const { isLoading } = useQuery(...)`.
// Restul paginii (randarea `{loading ? <Skeleton/> : <Continut/>}`) ramane la fel.
export function useMockLoading(durationMs: number = 5000): boolean {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), durationMs);
    return () => clearTimeout(timer);
  }, [durationMs]);

  return loading;
}
