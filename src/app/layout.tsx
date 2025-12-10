import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Spo S&A",
  description: "Sports Alarm App",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-100 min-h-screen flex justify-center`}
      >
        {/* ▼ 모바일 앱처럼 보이게 하는 중앙 컨테이너 (최대 너비 448px) */}
        <div className="w-full max-w-sm bg-white min-h-screen shadow-xl relative flex flex-col">
          
          {/* 1. 상단 타이틀 */}
          <header className="px-4 py-3 border-b border-gray-200 bg-white">
            <h1 className="text-xl font-bold text-gray-800">Spo S&A</h1>
          </header>

          {/* 2. 네비게이션 바 (탭 메뉴) */}
          <nav className="flex border-b border-gray-200 bg-white">
            <Link 
              href="/" 
              className="flex-1 py-3 text-center text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-gray-50 transition-colors"
            >
              홈
            </Link>
            <Link 
              href="/kbaseball" 
              className="flex-1 py-3 text-center text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-gray-50 transition-colors"
            >
              야구
            </Link>
            <Link 
              href="/kfootball" 
              className="flex-1 py-3 text-center text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-gray-50 transition-colors"
            >
              축구
            </Link>
          </nav>

          {/* 3. 실제 페이지 내용이 들어가는 곳 */}
          <main className="flex-1">
            {children}
          </main>

        </div>
      </body>
    </html>
  );
}