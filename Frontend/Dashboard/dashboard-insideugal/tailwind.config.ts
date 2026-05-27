import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // 1. PALETA DE CULORI REPLICATĂ DIN ȘABLON
      colors: {
        primary: {
          light: "#3b82f6", // Albastru hover (butoane)
          DEFAULT: "#2563eb", // Albastru principal ("+ Quick Create" / Linii grafic)
          dark: "#1d4ed8", // Albastru activ / apăsat
        },
        secondary: {
          light: "#64748b",
          DEFAULT: "#475569", // Albastru-gri pentru elemente secundare discrete
          dark: "#334155",
        },
        neutral: {
          50: "#f8fafc", // Fundalul principal al dashboard-ului (gri-ul foarte șters din spate)
          100: "#f1f5f9", // Fundal pentru elemente secundare (ex: bare de căutare, hover pe rânduri)
          200: "#e2e8f0", // Culoarea bordurilor fine din jurul cardurilor
          300: "#cbd5e1", // Liniile subțiri din interiorul graficelor / placeholder text
          400: "#94a3b8", // Text secundar mic sau iconițe mute
          500: "#64748b", // Etichete (labels) precum "Total for the last 3 months"
          600: "#475569", // Text mediu ca intensitate
          700: "#334155", // Text meniuri (Dashboard, Lifecycle, Analytics)
          800: "#1e293b", // Text important secundar
          900: "#0f172a", // Culoarea cifrelor mari și a titlurilor principale ($1,250.00 / Documents)
        },
        // Culori semantice mutate pe tonurile din imagine (Pastilele de procente)
        success: "#15803d", // Verde închis pentru textul "+12.5%"
        warning: "#b45309", // Chihlimbar/Portocaliu pentru atenționări
        error: "#b91c1c", // Roșu închis pentru textul "-20%"
      },

      // 2. SCALE DE DISTANȚE OBLIGATORII (4/8/12/16/24/32/48 px)
      spacing: {
        "4": "0.25rem", // 4px
        "8": "0.5rem", // 8px
        "12": "0.75rem", // 12px
        "16": "1rem", // 16px  -> Padding-ul din interiorul cardurilor tale
        "24": "1.5rem", // 24px -> Spațiul dintre carduri
        "32": "2rem", // 32px
        "48": "3rem", // 48px
      },

      // 3. IERARHIA TEXTULUI (5 Tier-uri curate conform imaginii)
      fontSize: {
        sm: ["0.875rem", { lineHeight: "1.25rem" }], // Text mic procente / etichete sub carduri (14px)
        base: ["1rem", { lineHeight: "1.5rem" }], // Textul din meniurile din stânga (16px)
        lg: ["1.125rem", { lineHeight: "1.75rem" }], // Titlurile mici de card ("Total Revenue") (18px)
        xl: ["1.5rem", { lineHeight: "2rem" }], // Titlul de secțiune ("Documents") (24px)
        "2xl": ["2.25rem", { lineHeight: "2.5rem" }], // Cifrele mari din dashboard ("$1,250.00") (36px)
      },

      // 4. ROTUNJIREA COLȚURILOR (Radius)
      borderRadius: {
        sm: "0.25rem", // 4px  -> Butoane mici sau checkbox-uri
        md: "0.375rem", // 6px  -> Butoanele de selecție interval ("Last 30 days")
        lg: "0.75rem", // 12px -> Rotunjirea superbă a cardurilor albe și a graficului
        full: "9999px", // Pentru butoane complet rotunde sau avatare
      },
    },
  },
  plugins: [],
};

export default config;
