import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import TokenCatcher from "@/components/TokenCatcher";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/ThemeProvider";
import I18nProvider from "@/components/I18nProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "代操投資系統 | Fund Allocation System",
  description: "台股代操資金管理與績效追蹤平台",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW" suppressHydrationWarning data-font="md">
      <body className={`${inter.className} min-h-screen`} style={{ backgroundColor: "var(--body-bg)", color: "var(--body-text)" }}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange={false}
        >
          <I18nProvider>
            <Suspense fallback={null}>
              <TokenCatcher />
            </Suspense>
            <div className="flex min-h-screen">
              <Sidebar />
              <main className="flex-1 p-4 md:p-8 overflow-auto pt-16 md:pt-8">
                {children}
              </main>
            </div>
            <Toaster />
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
