export function normalizeAccessCode(value: string): string {
  return value.trim().replace(/[\s-]+/g, "").toUpperCase();
}

export function normalizeCodePair(input: { programCode: string; participantCode: string }) {
  return {
    programCode: normalizeAccessCode(input.programCode),
    participantCode: normalizeAccessCode(input.participantCode)
  };
}

export function validateAccessCodeInput(input: { programCode: string; participantCode: string }) {
  const value = normalizeCodePair(input);

  if (!value.programCode) {
    return {
      ok: false as const,
      field: "programCode" as const,
      message: "프로그램 코드를 입력해주세요."
    };
  }

  if (!value.participantCode) {
    return {
      ok: false as const,
      field: "participantCode" as const,
      message: "참여자 코드를 입력해주세요."
    };
  }

  return {
    ok: true as const,
    value
  };
}
