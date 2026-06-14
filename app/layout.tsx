import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "AI 린캔버스 - 창업교육용 린캔버스 초안 자동화",
    template: "%s"
  },
  description: "창업교육용 린캔버스 초안 생성 및 PDF 제출 MVP"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
