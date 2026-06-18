// Logica de raspunsuri a chat-ului ACE (mock), extrasa ca modul shared, fara JSX.
//
// IMPORTANT: aceasta este o COPIE a logicii din `app/ace.tsx` (ecranul nativ de
// chat), folosita momentan DOAR de widget-ul de web (`components/ui/layout/ace.web.tsx`).
// Mobilul ramane neatins si pastreaza propria copie inline. Daca pe viitor se
// doreste o singura sursa de adevar, `app/ace.tsx` poate importa de aici — dar
// asta ar fi o modificare separata, asupra fisierului de mobil.

import MOCK_DATA from '@/constants/mock-data.json';

export interface AceEvent {
  title: string;
  date: string;
  location: string;
  description: string;
  badge?: string;
  link?: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  imageUrl?: string;
  event?: AceEvent;
}

export interface AceResponse {
  text: string;
  imageUrl?: string;
  event?: AceEvent;
}

export const getMockResponse = (text: string): AceResponse => {
  const cleanText = text.toLowerCase().trim();

  if (
    (cleanText.includes("eveniment") && cleanText.includes("cantin") && cleanText.includes("sesizar")) ||
    cleanText.includes("model de prompt")
  ) {
    return {
      text: "Salut! Iată un rezumat al informațiilor din campus pe care le avem integrate momentan:\n\n1. **Evenimente**: Gala Studenților UGAL 2026 (detalii mai jos).\n2. **Cantină**: Cantina se află în Campusul Științei. Meniul zilei poate fi vizualizat în tab-ul 'Cantină'.\n3. **Sesizări**: Poți raporta probleme (cămine, campus) direct din tab-ul 'Sesizări' folosind butonul (+).\n\nCum te mai pot ajuta?",
      imageUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=1000&auto=format&fit=crop",
      event: {
        title: "Gala Studenților UGAL 2026",
        date: "24 Mai 2026, 18:00",
        location: "Casa de Cultură a Studenților",
        description: "Cel mai mare eveniment al primăverii! Concerte live, workshop-uri, premii și stand-uri ale asociațiilor studențești. Te așteptăm cu drag!",
        badge: "Eveniment Campus",
        link: "/(public)/acasa/vizualizare?type=Eveniment&title=Gala%20Studen%C8%9Bilor%20UGAL%202026&category=Evenimente&content=Cel%20mai%20mare%20eveniment%20al%20prim%C4%83verii!%20Concerte%20live,%20workshop-uri,%20premii%20%C8%99i%20stand-uri%20ale%20asocia%C8%9Biilor%20studen%C8%9Be%C8%99ti.%20Te%20a%C8%99tept%C4%83m%20cu%20drag!&location=Casa%20de%20Cultur%C4%83%20a%20Studen%C8%9Bilor&date_start=2026-05-24&date_end=2026-05-24&time_start=18%3A00&time_end=22%3A00&date=24%20Mai%202026,%2018%3A00&image=https%3A%2F%2Fimages.unsplash.com%2Fphoto-1540575467063-178a50c2df87%3Fq%3D80%26w%3D1000",
      }
    };
  }

  if (
    cleanText.includes("noutat") ||
    cleanText.includes("noutăț") ||
    cleanText.includes("eveniment") ||
    cleanText.includes("poster") ||
    cleanText.includes("gala") ||
    cleanText.includes("concert")
  ) {
    return {
      text: "Iată cel mai recent eveniment organizat în campus:",
      imageUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=1000&auto=format&fit=crop",
      event: {
        title: "Gala Studenților UGAL 2026",
        date: "24 Mai 2026, 18:00",
        location: "Casa de Cultură a Studenților",
        description: "Cel mai mare eveniment al primăverii! Concerte live, workshop-uri, premii și stand-uri ale asociațiilor studențești. Te așteptăm cu drag!",
        badge: "Eveniment Campus",
        link: "/(public)/acasa/vizualizare?type=Eveniment&title=Gala%20Studen%C8%9Bilor%20UGAL%202026&category=Evenimente&content=Cel%20mai%20mare%20eveniment%20al%20prim%C4%83verii!%20Concerte%20live,%20workshop-uri,%20premii%20%C8%99i%20stand-uri%20ale%20asocia%C8%9Biilor%20studen%C8%9Be%C8%99ti.%20Te%20a%C8%99tept%C4%83m%20cu%20drag!&location=Casa%20de%20Cultur%C4%83%20a%20Studen%C8%9Bilor&date_start=2026-05-24&date_end=2026-05-24&time_start=18%3A00&time_end=22%3A00&date=24%20Mai%202026,%2018%3A00&image=https%3A%2F%2Fimages.unsplash.com%2Fphoto-1540575467063-178a50c2df87%3Fq%3D80%26w%3D1000",
      },
    };
  }

  if (
    cleanText.includes("cantina") ||
    cleanText.includes("mâncare") ||
    cleanText.includes("meniu") ||
    cleanText.includes("mancare") ||
    cleanText.includes("pret") ||
    cleanText.includes("preț")
  ) {
    return {
      text: "Cantina studențească se află în Campusul Științei (lângă Facultatea de Științe și Mediu). Oferă prânz la prețuri accesibile studenților, iar meniul cuprinde ciorbe, preparate calde și deserturi. Poți accesa secțiunea 'Cantină' din aplicație pentru a vedea meniul de azi actualizat."
    };
  }

  if (
    cleanText.includes("sesizare") ||
    cleanText.includes("reclamatie") ||
    cleanText.includes("problemă") ||
    cleanText.includes("problema") ||
    cleanText.includes("raport")
  ) {
    return {
      text: "Dacă ai întâmpinat o problemă în campus sau în cămine, o poți raporta direct din aplicație! Mergi în secțiunea 'Sesizări' din meniul de jos, apasă pe butonul de adăugare (+), selectează categoria și adaugă o descriere și o poză. Administrația va fi notificată imediat."
    };
  }

  if (
    cleanText.includes("harta") ||
    cleanText.includes("unde se afla") ||
    cleanText.includes("unde se află") ||
    cleanText.includes("localizare") ||
    cleanText.includes("adresa") ||
    cleanText.includes("locatie") ||
    cleanText.includes("locație") ||
    cleanText.includes("harta campus")
  ) {
    return {
      text: "Campusul UGAL este întins pe mai multe zone în Galați. Poți folosi secțiunea 'Hartă' din meniu pentru a localiza corpurile de clădire, facultățile, căminele studențești și cantina. Harta are ace de siguranță pentru fiecare locație cheie!"
    };
  }

  if (
    cleanText.includes("facultati") ||
    cleanText.includes("facultăți") ||
    cleanText.includes("facultate") ||
    cleanText.includes("specializari") ||
    cleanText.includes("acee")
  ) {
    return {
      text: "Universitatea 'Dunărea de Jos' are 14 facultăți, printre care:\n- Facultatea de Automatică, Calculatoare, Electrotehnică și Electronică (ACÉE)\n- Facultatea de Litere\n- Facultatea de Medicină și Farmacie\n- Facultatea de Științe și Mediu\n- Facultatea de Inginerie\n\nDetaliile despre secretariate și contacte le găsești în secțiunea 'Mai multe' -> 'Informații utile'."
    };
  }

  if (
    cleanText.includes("orar") ||
    cleanText.includes("cursuri") ||
    cleanText.includes("semestru") ||
    cleanText.includes("ore")
  ) {
    return {
      text: "Orarul cursurilor poate fi consultat pe platforma oficială a fiecărei facultăți sau prin grupurile de studenți. În viitor, InsideUGAL își propune să integreze orarul direct în aplicație pentru acces rapid!"
    };
  }

  if (
    cleanText.includes("camin") ||
    cleanText.includes("cămine") ||
    cleanText.includes("cazare") ||
    cleanText.includes("cazari") ||
    cleanText.includes("cazări")
  ) {
    return {
      text: "Căminele studențești UGAL sunt situate în Campusul Al. I. Cuza (Căminele A, B, C, D, G, H) și Campusul Științei (Căminele LS, Caminul 1 și 2). Pentru cereri de cazare sau sesizări privind căminele, folosește funcția 'Sesizări' din aplicație."
    };
  }

  if (
    cleanText.includes("bursa") ||
    cleanText.includes("burse") ||
    cleanText.includes("bani") ||
    cleanText.includes("sociala")
  ) {
    return {
      text: "Informații despre bursele de merit, de studiu sau sociale pot fi obținute de la secretariatul facultății tale sau de pe site-ul oficial ugal.ro, secțiunea Studenți -> Burse. De regulă, dosarele se depun la începutul fiecărui semestru."
    };
  }

  if (
    cleanText.includes("salut") ||
    cleanText.includes("buna") ||
    cleanText.includes("bună") ||
    cleanText.includes("hey") ||
    cleanText.includes("hello")
  ) {
    return {
      text: "Salut! Eu sunt Ace, asistentul tău virtual InsideUGAL. Te pot ajuta cu informații despre campus, facultăți, cantină, hărți sau cum să depui o sesizare. Cu ce te pot ajuta azi?"
    };
  }

  if (
    cleanText.includes("multumesc") ||
    cleanText.includes("mulțumesc") ||
    cleanText.includes("mersi") ||
    cleanText.includes("thanks") ||
    cleanText.includes("thank you")
  ) {
    return {
      text: "Cu mare drag! Dacă mai ai și alte întrebări, sunt aici să te ajut. O zi excelentă în campus! 🎓"
    };
  }

  if (cleanText.includes("hackathon") || cleanText.includes("inovație") || cleanText.includes("inovatie")) {
    const hackathon = MOCK_DATA.events.find(e => e.id === "2");
    return {
      text: "Iată informațiile despre **Hackathon-ul de 24 ore**: înscrierile sunt deschise!",
      imageUrl: hackathon?.image,
      event: {
        title: hackathon?.title || "",
        date: `${hackathon?.date_start}, ${hackathon?.time_start}`,
        location: hackathon?.location || "",
        description: hackathon?.content || "",
        badge: "Hackathon",
        link: "/event/2",
      }
    };
  }

  if (cleanText.includes("erasmus") || cleanText.includes("mobilitate")) {
    const erasmus = MOCK_DATA.events.find(e => e.id === "3");
    return {
      text: "Avem vești noi despre programul **Erasmus+**:",
      imageUrl: erasmus?.image,
      event: {
        title: erasmus?.title || "",
        date: erasmus?.date || "",
        location: erasmus?.author || "",
        description: erasmus?.content || "",
        badge: "Erasmus+",
        link: "/news/3",
      }
    };
  }

  return {
    text: `Interesant! Nu sunt sigur dacă am înțeles perfect întrebarea ta despre "${text}". Te pot ajuta cu detalii despre:\n1. Cantină și meniul zilei\n2. Harta campusului și facultăți\n3. Trimiterea unei sesizări\n\nÎncearcă să formulezi o întrebare mai specifică!`
  };
};

// Normalizeaza un link primit in raspuns (poate fi URL absolut, schema interna
// `insideugal://`, sau o cale scurta) catre o ruta interna Expo Router.
export const resolveLink = (link: string): string => {
  if (!link) return "";

  let path = link;
  if (link.startsWith('http://') || link.startsWith('https://')) {
    try {
      const match = link.match(/https?:\/\/[^\/]+(\/[^?#]*\??[^#]*)/);
      if (match) {
        path = match[1];
      }
    } catch {
      // Fallback
    }
  } else if (link.startsWith('insideugal://')) {
    path = '/' + link.substring('insideugal://'.length);
  }

  const eventMatch = path.match(/^\/?(event|eveniment)[s|e]?\/([a-zA-Z0-9_-]+)/i);
  if (eventMatch) {
    return `/(public)/acasa/vizualizare?type=Eveniment&id=${eventMatch[2]}`;
  }

  const newsMatch = path.match(/^\/?(news|noutate|anunt|noutati|anunturi)\/([a-zA-Z0-9_-]+)/i);
  if (newsMatch) {
    return `/(public)/acasa/vizualizare?type=Anunț&id=${newsMatch[2]}`;
  }

  const facultyMatch = path.match(/^\/?(facultate|facultati)\/([a-zA-Z0-9_-]+)/i);
  if (facultyMatch) {
    return `/(public)/acasa/vizualizare?type=Facultate&id=${facultyMatch[2]}`;
  }

  const facilityMatch = path.match(/^\/?(facilitate|facilitati)\/([a-zA-Z0-9_-]+)/i);
  if (facilityMatch) {
    return `/(public)/acasa/vizualizare?type=Facilitate&id=${facilityMatch[2]}`;
  }

  if (!path.startsWith('/(public)/')) {
    if (path.startsWith('/cantina')) {
      return '/(public)/cantina';
    }
    if (path.startsWith('/harta')) {
      return '/(public)/harta';
    }
    if (path.startsWith('/sesizari')) {
      return '/(public)/sesizari';
    }
    if (path.startsWith('/acasa')) {
      return '/(public)' + path;
    }
  }

  return path;
};

let messageIdCounter = 0;
export const generateMsgId = () => `msg_${Date.now()}_${++messageIdCounter}`;
