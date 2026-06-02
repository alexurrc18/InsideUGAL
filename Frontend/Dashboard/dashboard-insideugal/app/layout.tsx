import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import PageHeader from "./components/global/PageHeader";
import Sidebar from "./components/global/Sidebar";

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
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    <html lang="ro" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="h-screen overflow-hidden flex bg-neutral-50">
        <Providers>
          <div className="flex w-full h-screen overflow-hidden">
            <Sidebar />

            <div className="flex-1 min-w-0 h-screen flex flex-col overflow-hidden">
              <PageHeader />

              <main className="p-6 md:p-10 flex-1 overflow-y-auto">{children}</main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
