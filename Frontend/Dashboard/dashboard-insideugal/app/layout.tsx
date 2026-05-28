import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "./components/global/Sidebar";

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
    <html lang="ro" className="dark">
      <body className="bg-neutral-950 text-neutral-50 antialiased h-screen overflow-hidden flex m-0 p-0">
        {/* Structură curată: sidebar-ul stă lipit în stânga, conținutul în dreapta */}
        <div className="flex w-full h-full">
          {/* Lățimea sidebar-ului o setăm puțin mai mare (w-72) ca să aibă loc distanțarea din imagine */}
          <aside className="w-72 h-full flex-shrink-0 bg-neutral-950">
            <Sidebar />
          </aside>

          {/* Zona de conținut */}
          <main className="flex-1 min-w-0 bg-neutral-900 overflow-y-auto p-2xl">{children}</main>
        </div>
      </body>
    </html>
  );
}
