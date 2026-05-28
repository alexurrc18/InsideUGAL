import type { Metadata } from "next";
// 1. IMPORTUL LIPSA PENTRU FONTURI (Asta rezolvă erorile 2304 și 2552)
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import Sidebar from "./components/global/Sidebar"; // Importăm sidebar-ul tău albastru

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Inside UGAL - Stream",
  description: "Platformă Audio",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ro" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex bg-neutral-50">
        <Providers>
          <div className="flex w-full min-h-screen">
            {/* 🧭 Componenta ta de Sidebar */}
            <Sidebar />

            {/* 💻 Zona din dreapta care își schimbă paginile la click pe meniu */}
            <div className="flex-1 flex flex-col">
              <header className="h-16 bg-white border-b border-neutral-100 flex items-center px-32 justify-between shadow-sm">
                <strong className="text-h5 text-neutral-900 font-bold">Panou Principal</strong>
                <span className="text-p-xsmall text-neutral-500">Galați, România</span>
              </header>

              <main className="p-32 flex-1">{children}</main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
