"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { HighViewFeedback, HighViewParticipant, HighViewProgram, HighViewTeam } from "@/lib/types";
import { loadOperationsState } from "@/lib/operationsStorage";
import {
  mergeParticipantEntryIntoOperationsState,
  writeParticipantSession
} from "@/lib/participantSession";

interface JoinResponse {
  program?: HighViewProgram;
  participant?: HighViewParticipant;
  team?: HighViewTeam | null;
  feedbacks?: HighViewFeedback[];
  error?: string;
  code?: string;
}

function findLocalParticipantByToken(token: string) {
  const state = loadOperationsState();
  const participant = state.participants.find((item) => item.joinToken === token);
  if (!participant) return null;

  const program = state.programs.find((item) => item.id === participant.programId);
  if (!program) return null;

  const team = state.teams.find((item) => item.id === participant.teamId) || null;
  participant.joinedAt ||= new Date().toISOString();
  participant.lastSeenAt = new Date().toISOString();
  mergeParticipantEntryIntoOperationsState({ program, participant, team });
  return { program, participant, team };
}

export default function ParticipantJoinClient({ token }: { token: string }) {
  const router = useRouter();
  const [status, setStatus] = useState("입장 링크를 확인하고 있습니다.");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [manualCopyText, setManualCopyText] = useState("");

  const copyErrorForStaff = async () => {
    const message = `참여자 매직링크 입장 오류: ${error || "알 수 없는 오류"}`;
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setManualCopyText("");
    } catch {
      setCopied(false);
      setManualCopyText(message);
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function join() {
      if (!token) {
        setError("입장 토큰이 없습니다. 운영진에게 링크를 다시 요청해주세요.");
        return;
      }

      try {
        const response = await fetch(`/api/participants/join-token/${encodeURIComponent(token)}`);
        const data = (await response.json()) as JoinResponse;

        if (response.ok && data.program && data.participant) {
          mergeParticipantEntryIntoOperationsState({
            program: data.program,
            participant: data.participant,
            team: data.team || null,
            feedbacks: data.feedbacks
          });
          if (!cancelled) {
            setStatus(`${data.participant.name || data.participant.code}님 워크스페이스로 이동합니다.`);
            router.replace("/participant");
          }
          return;
        }

        const canUseDemoFallback =
          response.status === 503 &&
          (data.code === "SUPABASE_NOT_CONFIGURED" || data.code === "SUPABASE_TABLE_NOT_READY");
        if (canUseDemoFallback) {
          const local = findLocalParticipantByToken(token);
          if (local) {
            writeParticipantSession(local.program.id, local.participant.id);
            if (!cancelled) {
              setStatus(`${local.participant.name || local.participant.code}님 데모 워크스페이스로 이동합니다.`);
              router.replace("/participant");
            }
            return;
          }
        }

        if (!cancelled) {
          setError(data.error || "입장 링크를 찾을 수 없습니다.");
        }
        return;
      } catch (caught) {
        const local = findLocalParticipantByToken(token);
        if (local) {
          writeParticipantSession(local.program.id, local.participant.id);
          if (!cancelled) {
            setStatus(`${local.participant.name || local.participant.code}님 데모 워크스페이스로 이동합니다.`);
            router.replace("/participant");
          }
          return;
        }

        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "입장 링크 확인에 실패했습니다.");
        }
      }
    }

    void join();
    return () => {
      cancelled = true;
    };
  }, [router, token]);

  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center px-5 py-10">
      <main className="w-full rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm">
        <p className="text-sm font-semibold text-blue-700">참여자 매직링크</p>
        <h1 className="mt-2 text-2xl font-bold text-gray-950">{error ? "입장할 수 없습니다" : "입장 확인 중"}</h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          {error || status}
        </p>
        {error ? (
          <div className="mt-5 grid gap-2">
            <button
              className="rounded-md border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-800"
              onClick={copyErrorForStaff}
              type="button"
            >
              {copied ? "오류 내용 복사됨" : "운영진에게 보낼 오류 복사"}
            </button>
            {manualCopyText ? (
              <p className="rounded-md bg-gray-100 px-3 py-2 text-left text-xs leading-5 text-gray-700" role="status">
                자동 복사가 차단됐습니다. 운영진에게 아래 문구를 보여주세요.
                <span className="mt-1 block break-words font-mono">{manualCopyText}</span>
              </p>
            ) : null}
            <button
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-bold text-gray-800"
              onClick={() => window.location.reload()}
              type="button"
            >
              링크 다시 확인하기
            </button>
            <Link className="rounded-md bg-blue-700 px-4 py-2 text-sm font-bold text-white" href="/participant">
              코드로 직접 입장하기
            </Link>
            <Link className="rounded-md border border-gray-300 px-4 py-2 text-sm font-bold text-gray-800" href="/">
              역할 선택으로 돌아가기
            </Link>
            <p className="mt-2 text-xs leading-5 text-gray-500">
              링크가 만료됐거나 회수된 경우 운영진에게 새 입장 링크를 요청해주세요.
            </p>
          </div>
        ) : (
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-blue-100">
            <div className="h-full w-2/3 animate-pulse rounded-full bg-blue-700" />
          </div>
        )}
      </main>
    </div>
  );
}
