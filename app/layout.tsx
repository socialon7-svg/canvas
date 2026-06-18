import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "하이뷰랩 Startup OS",
    template: "%s"
  },
  description: "창업교육 참여자 과제와 현장 운영을 한 흐름으로 관리하는 하이뷰랩 Startup OS"
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
