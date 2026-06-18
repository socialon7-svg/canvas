import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "하이뷰랩 Startup OS"
};

const roleCards = [
  {
    href: "/participant",
    eyebrow: "교육생",
    title: "내 교육 프로그램 시작하기",
    description: "배정받은 모듈을 작성하고 제출 결과와 피드백을 확인해요.",
    action: "교육생으로 시작"
  },
  {
    href: "/internal",
    eyebrow: "운영진",
    title: "현장 운영 콘솔 열기",
    description: "참여 현황, 제출 오류, 피드백과 결과보고를 한눈에 관리해요.",
    action: "운영진으로 시작"
  }
];

export default function Home() {
  return (
    <main className="flex min-h-screen items-center px-5 py-10 sm:py-16">
      <section className="mx-auto w-full max-w-5xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold text-blue-600">HIGHVIEWLAB STARTUP OS</p>
          <h1 className="mt-4 text-3xl font-bold text-[#191f28] sm:text-5xl">
            오늘 교육, 바로 시작해요
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-[#6b7684]">
            교육생의 작성과 제출부터 운영진의 확인과 피드백까지 한곳에서 이어집니다.
          </p>
        </div>

        <div className="mx-auto mt-10 grid gap-4 md:grid-cols-2">
          {roleCards.map((card) => (
            <Link
              key={card.href}
              className="group app-surface flex min-h-[230px] flex-col p-6 hover:border-blue-200 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] sm:p-8"
              href={card.href}
            >
              <span className="inline-flex w-fit rounded-full bg-[#e8f3ff] px-3 py-1 text-xs font-bold text-[#1b64da]">
                {card.eyebrow}
              </span>
              <h2 className="mt-5 text-2xl font-bold text-[#191f28]">{card.title}</h2>
              <p className="mt-3 text-sm leading-6 text-[#6b7684]">{card.description}</p>
              <span className="mt-auto flex items-center justify-between pt-7 text-sm font-bold text-[#3182f6]">
                {card.action}<span aria-hidden="true">→</span>
              </span>
            </Link>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-[#8b95a1]">하이뷰랩 창업교육 현장 운영 시스템</p>
      </section>
    </main>
  );
}
