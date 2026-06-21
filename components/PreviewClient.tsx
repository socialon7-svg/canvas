"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import PrintableCanvas from "@/components/PrintableCanvas";
import StatusBadge from "@/components/StatusBadge";
import type { LeanCanvasSubmission, PdfStatus } from "@/lib/types";
import { getSubmission, updateSubmissionPdfStatus } from "@/lib/storage";
import { getFeedbackProgressStatus, getSubmissionStatus } from "@/lib/status";
import { INTERRUPTED_PDF_ERROR_MESSAGE, isStalePdfGeneration } from "@/lib/pdfStatus";

export default function PreviewClient({ id }: { id: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const printRef = useRef<HTMLDivElement>(null);
  const [submission, setSubmission] = useState<LeanCanvasSubmission | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfStatus, setPdfStatus] = useState<PdfStatus>("idle");
  const [pdfErrorMessage, setPdfErrorMessage] = useState("");
  const [fallbackNotice, setFallbackNotice] = useState("");
  const [autoDownloadStarted, setAutoDownloadStarted] = useState(false);

  useEffect(() => {
    const loadSubmission = async () => {
      setLoaded(false);
      setError("");
      setFallbackNotice("");

      const applyLocalSubmission = (localSubmission: LeanCanvasSubmission) => {
        const recovered = isStalePdfGeneration(localSubmission.pdfStatus, localSubmission.pdfStatusUpdatedAt)
          ? updateSubmissionPdfStatus(id, "failed", INTERRUPTED_PDF_ERROR_MESSAGE) || localSubmission
          : localSubmission;
        setSubmission(recovered);
        setPdfStatus(recovered.pdfStatus || "idle");
        setPdfErrorMessage(recovered.pdfErrorMessage || "");
      };

      try {
        const response = await fetch(`/api/submissions/${id}`);
        const data = (await response.json()) as {
          submission?: LeanCanvasSubmission;
          code?: string;
          error?: string;
        };

        if (response.ok && data.submission) {
          setSubmission(data.submission);
          setPdfStatus(data.submission.pdfStatus || "idle");
          setPdfErrorMessage(data.submission.pdfErrorMessage || "");
          return;
        }

        const localSubmission = getSubmission(id);
        if (localSubmission) {
          applyLocalSubmission(localSubmission);
          if (response.status === 503 && (data.code === "SUPABASE_NOT_CONFIGURED" || data.code === "SUPABASE_TABLE_NOT_READY")) {
            setFallbackNotice("중앙 저장소가 아직 설정되지 않아 이 브라우저의 임시 제출물을 표시합니다.");
          }
          return;
        }

        throw new Error(data.error || "제출물을 찾을 수 없습니다.");
      } catch (err) {
        const localSubmission = getSubmission(id);
        if (localSubmission) {
          applyLocalSubmission(localSubmission);
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

  const persistPdfStatus = async (nextStatus: PdfStatus, message = "") => {
    setPdfStatus(nextStatus);
    setPdfErrorMessage(nextStatus === "failed" ? message : "");
    updateSubmissionPdfStatus(id, nextStatus, message);

    try {
      const response = await fetch(`/api/submissions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfStatus: nextStatus, pdfErrorMessage: message })
      });
      const data = (await response.json()) as { submission?: LeanCanvasSubmission; error?: string };
      if (response.ok && data.submission) {
        setSubmission(data.submission);
        setPdfStatus(data.submission.pdfStatus || nextStatus);
        setPdfErrorMessage(data.submission.pdfErrorMessage || "");
        return true;
      }
      if (response.status !== 503) throw new Error(data.error || "PDF 상태를 서버에 저장하지 못했습니다.");
    } catch {
      setFallbackNotice("PDF 파일은 이 브라우저에서 만들 수 있지만 운영 상태 동기화에 실패했습니다. 네트워크 확인 후 다시 시도해주세요.");
    }
    return false;
  };

  const downloadPdf = async () => {
    if (!printRef.current) return;

    const captureTarget = printRef.current;
    captureTarget.classList.add("pdf-capture");
    setPdfLoading(true);
    await persistPdfStatus("generating");
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
        .from(captureTarget)
        .save();
      const synced = await persistPdfStatus("success");
      if (!synced) {
        setFallbackNotice("PDF 다운로드는 완료됐지만 운영 상태는 동기화하지 못했습니다. 네트워크 연결 후 이 화면에서 다시 다운로드해주세요.");
      }
    } catch (err) {
      await persistPdfStatus("failed", err instanceof Error ? err.message : "브라우저 PDF 생성에 실패했습니다.");
    } finally {
      captureTarget.classList.remove("pdf-capture");
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
    <div className="px-4 py-5 sm:px-5 sm:py-6">
      <section className="no-print mx-auto mb-4 max-w-[1120px] overflow-hidden rounded-lg border border-green-200 bg-white shadow-sm">
        <div className="bg-green-600 px-5 py-4 text-white sm:px-6">
          <p className="text-sm font-bold">정상적으로 접수됐어요</p>
          <h1 className="mt-1 text-2xl font-bold">제출 완료</h1>
          <p className="mt-1 text-sm text-green-50">이 화면이 보이면 운영진 제출 목록에도 저장된 상태입니다.</p>
        </div>
        <div className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-bold text-[#8b95a1]">접수번호</p>
            <p className="mt-1 font-mono text-xl font-black text-[#191f28]">{submission.id.slice(0, 8).toUpperCase()}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge type="submission" value={getSubmissionStatus(submission)} />
            <StatusBadge type="feedback" value={getFeedbackProgressStatus()} />
            <StatusBadge type="pdf" value={pdfStatus} />
          </div>
        </div>
        <dl className="mt-5 grid gap-4 rounded-md bg-[#f7f8fa] p-4 text-sm md:grid-cols-2">
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
        </div>
      </section>
      <div className="no-print mx-auto mb-5 flex max-w-[1120px] flex-col gap-4 rounded-lg border border-[#e5e8eb] bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <p className="text-sm font-bold text-[#3182f6]">제출물 보관하기</p>
          <h2 className="mt-1 text-xl font-bold text-[#191f28]">PDF로 저장하거나 바로 인쇄하세요</h2>
          <p className="mt-1 text-xs text-[#8b95a1]">PDF 생성이 실패해도 제출 기록은 안전하게 유지됩니다.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            data-pdf-download-button
            className="app-primary-button min-h-11 text-sm"
            disabled={pdfLoading}
            onClick={downloadPdf}
          >
            {pdfLoading ? "PDF 생성 중..." : pdfStatus === "failed" ? "PDF 다시 생성" : pdfStatus === "success" ? "PDF 다운로드" : "PDF 생성하기"}
          </button>
          <button className="app-secondary-button min-h-11 text-sm" onClick={print}>
            바로 인쇄
          </button>
          <button className="app-secondary-button min-h-11 text-sm" onClick={() => router.push("/participant")}>
            내 교육 화면으로
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
