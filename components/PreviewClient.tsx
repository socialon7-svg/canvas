"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PrintableCanvas from "@/components/PrintableCanvas";
import type { LeanCanvasSubmission } from "@/lib/types";
import { getSubmission } from "@/lib/storage";

export default function PreviewClient({ id }: { id: string }) {
  const router = useRouter();
  const [submission, setSubmission] = useState<LeanCanvasSubmission | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setSubmission(getSubmission(id));
    setLoaded(true);
  }, [id]);

  if (!loaded) {
    return <div className="px-5 py-10 text-sm text-gray-600">제출물을 불러오는 중입니다...</div>;
  }

  if (!submission) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-10">
        <div className="rounded-lg border border-red-200 bg-white p-6 text-sm text-red-700">
          제출물을 찾을 수 없습니다. 같은 브라우저의 localStorage에 저장된 제출물만 MVP에서 확인할 수 있습니다.
        </div>
        <a className="mt-4 inline-block rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white" href="/">
          새로 작성하기
        </a>
      </div>
    );
  }

  const print = () => window.print();

  return (
    <div className="px-5 py-6">
      <div className="no-print mx-auto mb-5 flex max-w-[1120px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-700">제출 완료</p>
          <h1 className="text-2xl font-bold text-gray-950">PDF 미리보기</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white" onClick={print}>
            PDF 다운로드
          </button>
          <button className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold" onClick={print}>
            바로 인쇄
          </button>
          <button className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold" onClick={() => router.push("/")}>
            새로 작성하기
          </button>
        </div>
      </div>
      <PrintableCanvas submission={submission} />
      <p className="no-print mx-auto mt-3 max-w-[1120px] text-xs text-gray-500">
        PDF 다운로드 버튼은 브라우저 인쇄 창을 열며, 대상에서 PDF 저장을 선택하면 파일로 저장할 수 있습니다.
      </p>
    </div>
  );
}
