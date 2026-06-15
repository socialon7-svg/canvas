"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import PrintableCanvas from "@/components/PrintableCanvas";
import StatusBadge from "@/components/StatusBadge";
import type { LeanCanvasSubmission, PdfStatus } from "@/lib/types";
import { getSubmission } from "@/lib/storage";
import { getFeedbackProgressStatus, getSubmissionStatus } from "@/lib/status";

export default function PreviewClient({ id }: { id: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const printRef = useRef<HTMLDivElement>(null);
  const [submission, setSubmission] = useState<LeanCanvasSubmission | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfStatus, setPdfStatus] = useState<PdfStatus>("success");
  const [pdfErrorMessage, setPdfErrorMessage] = useState("");
  const [fallbackNotice, setFallbackNotice] = useState("");
  const [autoDownloadStarted, setAutoDownloadStarted] = useState(false);

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
          setPdfStatus(data.submission.pdfStatus || "success");
          return;
        }

        const localSubmission = getSubmission(id);
        if (localSubmission) {
          setSubmission(localSubmission);
          setPdfStatus(localSubmission.pdfStatus || "success");
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
          setPdfStatus(localSubmission.pdfStatus || "success");
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

  const safeFilePart = (value: string) =>
    value
      .trim()
      .replace(/[\/:*?"<>|]/g, "")
      .replace(/\s+/g, "_")
      .slice(0, 40);

  const fileName = `${safeFilePart(submission?.participant.teamName || "팀")}_${safeFilePart(
    submission?.participant.ideaName || "린캔버스"
  )}.pdf`;

  const downloadPdf = async () => {
    if (!printRef.current) return;

    setPdfLoading(true);
    setPdfStatus("generating");
    setPdfErrorMessage("");
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
      setPdfStatus("success");
    } catch (err) {
      setPdfStatus("failed");
      setPdfErrorMessage(err instanceof Error ? err.message : "브라우저 PDF 생성에 실패했습니다.");
    } finally {
      setPdfLoading(false);
    }
  };

  const print = () => window.print();

  useEffect(() => {
    if (!loaded || !submission || autoDownloadStarted || searchParams.get("download") !== "1") return;

    setAutoDownloadStarted(true);
    const timer = window.setTimeout(() => {
      document.querySelector<HTMLButtonElement>("[data-pdf-download-button]")?.click();
    }, 300);

    return () => window.clearTimeout(timer);
  }, [autoDownloadStarted, loaded, searchParams, submission]);

  if (!loaded) {
    return <div className="px-5 py-10 text-sm text-gray-600">제출물을 불러오는 중입니다...</div>;
  }

  if (error || !submission) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-10">
        <div className="rounded-lg border border-red-200 bg-white p-6 text-sm text-red-700">
          {error || "제출물을 찾을 수 없습니다."}
        </div>
        <Link className="mt-4 inline-block rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-800 active:bg-blue-900" href="/participant">
          새로 작성하기
        </Link>
      </div>
    );
  }

  return (
    <div className="px-5 py-6">
      <section className="no-print mx-auto mb-4 max-w-[1120px] rounded-lg border border-green-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold text-green-700">제출이 완료되었습니다</p>
            <h1 className="mt-1 text-2xl font-bold text-gray-950">제출 완료 증명</h1>
            <p className="mt-2 text-sm text-gray-600">
              아래 정보가 보이면 제출 기록이 정상 저장된 것입니다. PDF 생성 실패와 제출 실패는 별개로 표시됩니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge type="submission" value={getSubmissionStatus(submission)} />
            <StatusBadge type="feedback" value={getFeedbackProgressStatus()} />
            <StatusBadge type="pdf" value={pdfStatus} />
          </div>
        </div>
        <dl className="mt-5 grid gap-3 rounded-md bg-gray-50 p-4 text-sm md:grid-cols-2">
          <div>
            <dt className="text-gray-500">프로그램</dt>
            <dd className="font-semibold text-gray-950">{submission.participant.educationName || "-"}</dd>
          </div>
          <div>
            <dt className="text-gray-500">팀/참여자</dt>
            <dd className="font-semibold text-gray-950">
              {submission.participant.teamName || "-"} / {submission.participant.participantName || "-"}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">제출물</dt>
            <dd className="font-semibold text-gray-950">{submission.participant.ideaName || "린캔버스 초안"}</dd>
          </div>
          <div>
            <dt className="text-gray-500">제출 시간</dt>
            <dd className="font-semibold text-gray-950">{new Date(submission.createdAt).toLocaleString("ko-KR")}</dd>
          </div>
        </dl>
        {pdfStatus === "failed" ? (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            PDF 생성에 실패했습니다. 제출 데이터는 저장되어 있으니 다시 생성하거나 바로 인쇄를 이용하세요.
            {pdfErrorMessage ? <p className="mt-1 text-xs">{pdfErrorMessage}</p> : null}
          </div>
        ) : null}
      </section>
      <div className="no-print mx-auto mb-5 flex max-w-[1120px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-700">제출 완료</p>
          <h2 className="text-2xl font-bold text-gray-950">A4 가로형 PDF 미리보기</h2>
          <p className="mt-1 text-xs text-gray-500">PDF 다운로드가 실패해도 제출 기록은 유지됩니다.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            data-pdf-download-button
            className="rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-800 active:bg-blue-900 disabled:bg-gray-400"
            disabled={pdfLoading}
            onClick={downloadPdf}
          >
            {pdfLoading ? "PDF 생성 중..." : pdfStatus === "failed" ? "PDF 다시 생성" : "PDF 다운로드"}
          </button>
          <button className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold transition-colors hover:bg-gray-50" onClick={print}>
            바로 인쇄
          </button>
          <button className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold transition-colors hover:bg-gray-50" onClick={() => router.push("/admin")}>
            관리자 목록
          </button>
          <button className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold transition-colors hover:bg-gray-50" onClick={() => router.push("/participant")}>
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
