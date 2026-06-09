"use client";

import { usePathname } from "next/navigation";
// Importăm fișierul de stil folosind calea relativă exactă către folderul tău components/global
import "./globals.css"; 

// Importăm componentele globale folosind căile relative corecte
import Sidebar from "./components/global/Sidebar";
import Header from "./components/global/PageHeader";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Ascundem elementele globale când suntem pe pagina de login
  const isLoginPage = pathname === "/login";

  return (
    <html lang="ro">
      <body className="bg-background">
        {isLoginPage ? (
          // Pe pagina de login, randăm doar conținutul curat și centrat
          <div className="w-full min-h-screen flex items-center justify-center">
            {children}
          </div>
        ) : (
          // Structura ta existentă pentru dashboard
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex-1 flex flex-col">
              <Header />
              <main className="p-6 flex-1 bg-background">
                {children}
              </main>
            </div>
          </div>
        )}
      </body>
    </html>
  );
}