import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Quibo — Next.js + Prisma",
  description: "Aplicação fullstack com Next.js 16 e Prisma 7",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen antialiased">
        <header className="border-b border-white/10 bg-white/5 backdrop-blur-sm sticky top-0 z-50">
          <nav className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link href="/" className="font-bold text-xl text-white tracking-tight">
              quibo<span className="text-violet-400">.</span>
            </Link>
            <div className="flex items-center gap-6 text-sm font-medium text-slate-400">
              <Link href="/users" className="hover:text-white transition-colors">Usuários</Link>
              <Link href="/posts" className="hover:text-white transition-colors">Posts</Link>
              <a
                href="https://www.prisma.io/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                Docs Prisma
              </a>
            </div>
          </nav>
        </header>

        <main className="max-w-5xl mx-auto px-6 py-10">
          {children}
        </main>

        <footer className="border-t border-white/10 mt-20 py-6 text-center text-sm text-slate-600">
          Next.js {process.env.npm_package_dependencies_next ?? "16"} · Prisma{" "}
          {process.env.npm_package_dependencies_prisma ?? "7"} · SQLite
        </footer>
      </body>
    </html>
  );
}
