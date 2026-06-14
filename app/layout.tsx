import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "하이뷰랩 프로그램 운영 MVP",
    template: "%s"
  },
  description: "창업교육·캠프 참여자 과제 제출과 내부 운영 관리를 위한 MVP"
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
