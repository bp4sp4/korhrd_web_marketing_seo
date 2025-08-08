import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "마케팅 허브 - 네이버 마케팅을 위한 올인원 도구",
  description: "키워드 분석, 콘텐츠 생성, 성과 측정까지. 네이버 블로그 상위노출을 위한 모든 도구를 한 곳에서 만나보세요.",
  keywords: "네이버 마케팅, 블로그 상위노출, 키워드 분석, 콘텐츠 마케팅, SEO 최적화",
  authors: [{ name: "마케팅 허브" }],
  openGraph: {
    title: "마케팅 허브 - 네이버 마케팅을 위한 올인원 도구",
    description: "키워드 분석, 콘텐츠 생성, 성과 측정까지. 네이버 블로그 상위노출을 위한 모든 도구를 한 곳에서 만나보세요.",
    type: "website",
    locale: "ko_KR",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
