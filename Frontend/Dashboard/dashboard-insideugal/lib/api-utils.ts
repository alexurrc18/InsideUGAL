// Caută fișierul care conține apiRequest și asigură-te că exportă funcția
export const apiRequest = async (url: string, schema: any, options: any = {}) => {
  // Obține token-ul (presupunând că e în localStorage)
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const response = await fetch(`http://10.66.4.9:8000${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}), // AICI SE REZOLVĂ 401
      ...options.headers,
    },
  });

  if (response.status === 401) {
    console.error("401 Unauthorized: Token expirat sau lipsă");
  }

  return response.json();
};