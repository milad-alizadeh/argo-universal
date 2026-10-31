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
  ['operations/router.ts', ['run', 'wait']],
  // Deciding who can reach the Server is the owner's alone (ADR-0045), so it is not an Operation and has no tier. Today nothing server-side stops a caller on the Server Device, an Agent included, from calling it; `serverDeviceProcedure` (#1497) is what will.
  ['network-access/router.ts', ['setLocalAccess']],
]);

export function permittedMutation(file: string, name: string): boolean {
  const relative = file.replace(/^packages\/engine\/src\//, '');

  const names = retained.get(relative) ?? [];

  return names.includes(name);
}
