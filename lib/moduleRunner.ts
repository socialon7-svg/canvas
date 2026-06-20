import { z } from "zod";
import {
  automatedStartupModuleDraftSchema,
  buildStartupModuleAutomationPrompt,
  getStartupModuleAutomationConfig,
  parseStartupModuleAutomationJson,
  type AutomatedStartupModuleDraft,
  type AutomatedStartupModuleInput
} from "@/lib/startupModuleAutomation";

const optionalText = (max: number) => z.string().trim().max(max).optional().default("");

export const moduleRunnerInputSchema = z.object({
  moduleSlug: z.string().trim().min(1).max(100),
  programName: optionalText(300),
  teamName: optionalText(200),
  participantName: optionalText(100),
  ideaMemo: z.string().trim().min(1, "모듈 메모를 입력해 주세요.").max(6000),
  previousResults: optionalText(12000),
  operation: z
    .object({
      programId: optionalText(200),
      programCode: optionalText(100),
      programName: optionalText(300),
      participantId: optionalText(200),
      participantCode: optionalText(100),
      teamId: optionalText(200),
      teamName: optionalText(300),
      role: optionalText(100)
    })
    .optional()
});

export type ModuleRendererType = "structured-sections";

export interface ModuleRunnerDefinition {
  slug: string;
  adminOnly: boolean;
  rendererType: ModuleRendererType;
  inputSchema: typeof moduleRunnerInputSchema;
  outputSchema: typeof automatedStartupModuleDraftSchema;
  promptTemplate: (input: AutomatedStartupModuleInput) => string;
  parseOutput: (raw: string) => AutomatedStartupModuleDraft;
}

export function getModuleRunnerDefinition(slug: string): ModuleRunnerDefinition | undefined {
  const config = getStartupModuleAutomationConfig(slug);
  if (!config) return undefined;

  return {
    slug,
    adminOnly: config.adminOnly,
    rendererType: "structured-sections",
    inputSchema: moduleRunnerInputSchema,
    outputSchema: automatedStartupModuleDraftSchema,
    promptTemplate: (input) => buildStartupModuleAutomationPrompt(input, config),
    parseOutput: (raw) => parseStartupModuleAutomationJson(raw, config)
  };
}
