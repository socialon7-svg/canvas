"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { HighViewParticipant, HighViewProgram, HighViewTeam, StartupModule } from "@/lib/types";
import { fetchParticipantWorkspace, readParticipantSession, writeParticipantSession } from "@/lib/participantSession";
import { getParticipantVisibleModules } from "@/lib/startupModules";
import {
  getNextParticipantModule,
  getParticipantIdeaContext,
  getParticipantModuleRoute,
  isDemoProgram,
  LEAN_CANVAS_MODULE_SLUG,
  mergeIdeaContextIntoModuStartupInput,
  mergeIdeaContextIntoParticipantInput,
  MODU_STARTUP_MODULE_SLUG
} from "@/lib/participantModuleFlow";
import { loadOperationsState, toModuStartupInput, toParticipantInput } from "@/lib/operationsStorage";
import { saveModuStartupPrefill, saveParticipantPrefill } from "@/lib/storage";

interface ParticipantWorkspace {
  program: HighViewProgram;
  participant: HighViewParticipant;
  team?: HighViewTeam | null;
}

export default function ParticipantNextModuleButton({ currentSlug }: { currentSlug: string }) {
  const router = useRouter();
  const [workspace, setWorkspace] = useState<ParticipantWorkspace | null>(null);
  const [nextModule, setNextModule] = useState<StartupModule | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    const applyWorkspace = (nextWorkspace: ParticipantWorkspace) => {
      const modules = getParticipantVisibleModules(nextWorkspace.program);
      if (!modules.some((module) => module.slug === currentSlug)) return;
      setWorkspace(nextWorkspace);
      setNextModule(getNextParticipantModule(modules, currentSlug) || null);
    };

    const session = readParticipantSession();
    const localState = loadOperationsState();
    const localProgram = localState.programs.find((program) => program.id === session.programId);
    const localParticipant = localState.participants.find((participant) => participant.id === session.participantId);
    if (localProgram && localParticipant) {
      applyWorkspace({
        program: localProgram,
        participant: localParticipant,
        team: localState.teams.find((team) => team.id === localParticipant.teamId) || null
      });
    }

    fetchParticipantWorkspace()
      .then(({ response, data }) => {
        if (cancelled) return;
        if (!response.ok || !data.program || !data.participant) {
          if (response.status === 401 && localProgram && isDemoProgram(localProgram) && localParticipant) {
            writeParticipantSession(localProgram.id, localParticipant.id);
          }
          return;
        }
        applyWorkspace({ program: data.program, participant: data.participant, team: data.team });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [currentSlug]);

  if (nextModule === undefined) return null;

  const continueCourse = () => {
    if (!workspace) return;
    if (!nextModule) {
      router.push("/participant?course=complete");
      return;
    }

    const ideaContext = getParticipantIdeaContext(workspace.participant);
    if (nextModule.slug === LEAN_CANVAS_MODULE_SLUG) {
      saveParticipantPrefill(
        mergeIdeaContextIntoParticipantInput(
          toParticipantInput(workspace.program, workspace.participant, workspace.team || undefined),
          ideaContext
        )
      );
    } else if (nextModule.slug === MODU_STARTUP_MODULE_SLUG) {
      saveModuStartupPrefill(
        mergeIdeaContextIntoModuStartupInput(
          toModuStartupInput(workspace.program, workspace.participant, workspace.team || undefined),
          ideaContext
        )
      );
    }
    router.push(getParticipantModuleRoute(nextModule));
  };

  return (
    <button className="app-primary-button inline-flex items-center text-sm" onClick={continueCourse} type="button">
      {nextModule ? `다음: ${nextModule.title}` : "과정 완료 확인"}
    </button>
  );
}
