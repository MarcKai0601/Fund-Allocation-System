import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "代操投資系統 | Fund Allocation System",
  description: "台股代操資金管理與績效追蹤平台",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW" className="dark">
      <body className={`${inter.className} bg-gray-950 text-gray-100 min-h-screen`}>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 p-8 overflow-auto">
            {children}
          </main>
        </div>
        <Toaster theme="dark" />
      </body>
    </html>
  );
}
