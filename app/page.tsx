import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "하이뷰랩 프로그램 운영 MVP"
};

const roleCards = [
  {
    href: "/participant",
    eyebrow: "참여자",
    title: "참여자 입장",
    description: "프로그램 코드와 참여자 코드로 내 정보, 팀, 과제, 피드백을 확인합니다.",
    action: "참여자로 입장하기"
  },
  {
    href: "/internal",
    eyebrow: "운영진",
    title: "공식 운영 콘솔",
    description: "프로그램, 참여자, 제출·PDF 상태, 피드백과 결과보고를 한 화면에서 관리합니다.",
    action: "운영 콘솔 열기"
  }
];

export default function Home() {
  return (
    <main className="flex min-h-screen items-center px-5 py-10">
      <section className="mx-auto w-full max-w-6xl">
        <div className="text-center">
          <p className="text-sm font-semibold text-blue-700">창업교육·캠프 운영 MVP</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl">
            하이뷰랩 프로그램 운영 MVP
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-gray-600 sm:text-base">
            참여자는 과제를 작성·제출하고, 내부직원은 프로그램 운영과 제출물 피드백을 한 흐름으로 관리합니다.
          </p>
        </div>

        <div className="mx-auto mt-8 grid max-w-4xl gap-4 md:grid-cols-2">
          {roleCards.map((card) => (
            <Link
              key={card.href}
              className="group rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all duration-200 hover:border-blue-300 hover:shadow-md"
              href={card.href}
            >
              <p className="text-sm font-semibold text-blue-700">{card.eyebrow}</p>
              <h2 className="mt-2 text-xl font-bold text-gray-950">{card.title}</h2>
              <p className="mt-2 min-h-12 text-sm leading-6 text-gray-600">{card.description}</p>
              <span className="mt-5 inline-flex rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white transition-colors group-hover:bg-blue-800 group-active:bg-blue-900">
                {card.action}
              </span>
            </Link>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-gray-500">© 2026 하이뷰랩 프로그램 운영 MVP</p>
      </section>
    </main>
  );
}
