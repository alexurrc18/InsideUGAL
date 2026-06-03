import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import PageHeader from "./components/global/PageHeader";
import Sidebar from "./components/global/Sidebar";

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
  description: "Platforma Audio",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ro" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="h-screen overflow-hidden bg-background text-foreground">
        <Providers>
          <div className="flex w-full h-screen overflow-hidden">
            <Sidebar />

            <div className="flex-1 min-w-0 h-screen flex flex-col overflow-hidden bg-background">
              <PageHeader />

              <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8">
                <div className="mx-auto w-full max-w-7xl">{children}</div>
              </main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
