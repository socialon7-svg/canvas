"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PrintableCanvas from "@/components/PrintableCanvas";
import type { LeanCanvasSubmission } from "@/lib/types";
import { getSubmission } from "@/lib/storage";

export default function PreviewClient({ id }: { id: string }) {
  const router = useRouter();
  const printRef = useRef<HTMLDivElement>(null);
  const [submission, setSubmission] = useState<LeanCanvasSubmission | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [fallbackNotice, setFallbackNotice] = useState("");

  useEffect(() => {
    const loadSubmission = async () => {
      setLoaded(false);
      setError("");
      setFallbackNotice("");

      try {
        const response = await fetch(`/api/submissions/${id}`);
        const data = (await response.json()) as {
          submission?: LeanCanvasSubmission;
          code?: string;
          error?: string;
        };

        if (response.ok && data.submission) {
          setSubmission(data.submission);
          return;
        }

        const localSubmission = getSubmission(id);
        if (localSubmission) {
          setSubmission(localSubmission);
          if (response.status === 503 && (data.code === "SUPABASE_NOT_CONFIGURED" || data.code === "SUPABASE_TABLE_NOT_READY")) {
            setFallbackNotice("중앙 저장소가 아직 설정되지 않아 이 브라우저의 임시 제출물을 표시합니다.");
          }
          return;
        }

        throw new Error(data.error || "제출물을 찾을 수 없습니다.");
      } catch (err) {
        const localSubmission = getSubmission(id);
        if (localSubmission) {
          setSubmission(localSubmission);
          setFallbackNotice("서버 제출물 조회에 실패해 이 브라우저의 임시 제출물을 표시합니다.");
        } else {
          setError(err instanceof Error ? err.message : "제출물을 불러오지 못했습니다.");
        }
      } finally {
        setLoaded(true);
      }
    };

    loadSubmission();
  }, [id]);

  if (!loaded) {
    return <div className="px-5 py-10 text-sm text-gray-600">제출물을 불러오는 중입니다...</div>;
  }

  if (error || !submission) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-10">
        <div className="rounded-lg border border-red-200 bg-white p-6 text-sm text-red-700">
          {error || "제출물을 찾을 수 없습니다."}
        </div>
        <Link className="mt-4 inline-block rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white" href="/">
          새로 작성하기
        </Link>
      </div>
    );
  }

  const safeFilePart = (value: string) =>
    value
      .trim()
      .replace(/[\/:*?"<>|]/g, "")
      .replace(/\s+/g, "_")
      .slice(0, 40);

  const fileName = `${safeFilePart(submission.participant.teamName || "팀")}_${safeFilePart(
    submission.participant.ideaName || "린캔버스"
  )}.pdf`;

  const downloadPdf = async () => {
    if (!printRef.current) return;

    setPdfLoading(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;

      await html2pdf()
        .set({
          margin: 4,
          filename: fileName,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            letterRendering: true
          },
          jsPDF: {
            unit: "mm",
            format: "a4",
            orientation: "landscape"
          },
          pagebreak: {
            mode: ["avoid-all", "css", "legacy"]
          }
        })
        .from(printRef.current)
        .save();
    } finally {
      setPdfLoading(false);
    }
  };

  const print = () => window.print();

  return (
    <div className="px-5 py-6">
      <div className="no-print mx-auto mb-5 flex max-w-[1120px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-700">제출 완료</p>
          <h1 className="text-2xl font-bold text-gray-950">제출 완료 / PDF 미리보기</h1>
          <p className="mt-1 text-xs text-gray-500">PDF 다운로드 또는 현장 인쇄를 진행하세요.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white disabled:bg-gray-400"
            disabled={pdfLoading}
            onClick={downloadPdf}
          >
            {pdfLoading ? "PDF 생성 중..." : "PDF 다운로드"}
          </button>
          <button className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold" onClick={print}>
            바로 인쇄
          </button>
          <button className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold" onClick={() => router.push("/admin")}>
            관리자 목록
          </button>
          <button className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold" onClick={() => router.push("/")}>
            새로 작성하기
          </button>
        </div>
      </div>
      {fallbackNotice ? (
        <p className="no-print mx-auto mb-3 max-w-[1120px] rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          {fallbackNotice}
        </p>
      ) : null}
      <div ref={printRef}>
        <PrintableCanvas submission={submission} />
      </div>
    </div>
  );
}
