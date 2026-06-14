import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "AI 린캔버스 - 창업교육용 린캔버스 초안 자동화"
};

const roleCards = [
  {
    href: "/participant",
    eyebrow: "참여자",
    title: "참여자 입장",
    description: "내부직원이 발급한 프로그램 코드와 참여자 코드로 입장합니다.",
    action: "참여자로 입장하기"
  },
  {
    href: "/internal",
    eyebrow: "내부직원",
    title: "내부직원 로그인",
    description: "운영 포털에서 프로그램, 참여자, 팀, 제출물과 피드백을 관리합니다.",
    action: "직원 로그인"
  }
];

export default function Home() {
  return (
    <main className="flex min-h-screen items-center px-5 py-10">
      <section className="mx-auto w-full max-w-3xl">
        <div className="text-center">
          <p className="text-sm font-semibold text-blue-700">창업교육 MVP</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl">
            AI 린캔버스 작성 및 PDF 제출
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-gray-600 sm:text-base">
            창업 아이디어를 입력하면 AI가 린캔버스 초안을 만들고, 수정 후 PDF로 제출할 수 있습니다.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
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

        <p className="mt-8 text-center text-xs text-gray-500">© 2026 린캔버스 초안 자동화</p>
      </section>
    </main>
  );
}
