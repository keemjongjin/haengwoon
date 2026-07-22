import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeScript } from "@/components/common/ThemeScript";
import { Header } from "@/components/common/Header";
import { Footer } from "@/components/common/Footer";
import { VisitorPing } from "@/components/common/VisitorPing";
import { AudioPlayerProvider } from "@/components/music/AudioPlayerContext";
import { NowPlayingBar } from "@/components/music/NowPlayingBar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Haengwoon — Tech & Music",
  description: "기술 블로그와 음악 아카이브를 한 곳에서",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      data-mode="tech"
      data-theme="light"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full flex flex-col">
        <AudioPlayerProvider>
          <VisitorPing />
          <Header />
          {/* main+재생바를 한 컨테이너로 묶어 sticky 범위를 이 안으로 제한 — 푸터를 덮지 않고 그 위에서 멈춤 */}
          <div className="relative flex flex-1 flex-col">
            <main className="flex-1 w-full max-w-3xl mx-auto px-5 py-10 sm:px-8">{children}</main>
            <NowPlayingBar />
          </div>
          <Footer />
        </AudioPlayerProvider>
      </body>
    </html>
  );
}
