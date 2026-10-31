// Consent, sign-in, presence and App plumbing stay hand-written (ADR-0044).
const retained = new Map<string, readonly string[]>([
  [
    'sessions/router.ts',
    ['markSeen', 'open', 'answerPermission', 'answerElicitation'],
  ],
  [
    'agents/auth/router.ts',
    ['authenticate', 'cancelAuthenticate', 'authTerminalInput'],
  ],
  ['plugins/accounts/router.ts', ['choose', 'grant', 'signOut']],
  ['plugins/router.ts', ['dispatch', 'renderFailed']],
  ['notifications/router.ts', ['attention', 'acknowledge']],
  ['blob/router.ts', ['upload']],
  // How the Server Device runs is the owner's alone: ADR-0044's exception for what is the user's alone, which ADR-0045 extends. Staying out of the registry means no Agent can reach it as an Operation, and `serverDeviceProcedure` refuses every Paired Device (#1497); neither stops an Agent that reaches loopback tRPC as the Server Device, which is #1696.
  ['system/router.ts', ['setKeepRunning']],
  ['operations/router.ts', ['run', 'wait']],
  // Deciding who can reach the Server is the owner's alone (ADR-0045), so it is not an Operation and has no tier: no Agent can reach it as an Operation. That is not the same as being out of an Agent's reach, because an Agent's Session runs on the Server Device, whose loopback tRPC `serverDeviceProcedure` admits (#1497) until #1696 shuts the plain-HTTP door.
  ['network-access/router.ts', ['setLocalAccess']],
]);

export function permittedMutation(file: string, name: string): boolean {
  const relative = file.replace(/^packages\/engine\/src\//, '');

  const names = retained.get(relative) ?? [];

  return names.includes(name);
}
