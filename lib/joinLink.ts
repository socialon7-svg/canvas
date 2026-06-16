export function getParticipantJoinPath(joinToken: string) {
  return `/participant/join?token=${encodeURIComponent(joinToken)}`;
}

export function getShortParticipantJoinPath(joinToken: string) {
  return `/p/${encodeURIComponent(joinToken)}`;
}

export function getParticipantJoinUrl(origin: string, joinToken?: string) {
  if (!joinToken) return "";
  return `${origin.replace(/\/$/, "")}${getParticipantJoinPath(joinToken)}`;
}

export function getParticipantQrFilename(programCode: string, participantCode: string) {
  return `${programCode || "program"}-${participantCode || "participant"}-join-qr.png`;
}
