"use client";

import { usePathname } from "next/navigation";
import "./globals.css"; 
import Sidebar from "./components/global/Sidebar";
import Header from "./components/global/PageHeader";
import { Providers } from "./providers";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  return (
    <html lang="ro">
      <body className="bg-background">
        <Providers>
          {isLoginPage ? (
            <div className="w-full min-h-screen flex items-center justify-center">
              {children}
            </div>
          ) : (
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
        </Providers>
      </body>
    </html>
  );
}