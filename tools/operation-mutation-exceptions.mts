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
  // The Server Device's own setting, never an Agent's: ADR-0044's exception for what is the user's alone, which ADR-0045 extends.
  ['system/router.ts', ['setKeepRunning']],
  ['operations/router.ts', ['run', 'wait']],
  // Deciding who can reach the Server is the owner's alone, never an Agent's (ADR-0045).
  ['network-access/router.ts', ['setLocalAccess']],
]);

export function permittedMutation(file: string, name: string): boolean {
  const relative = file.replace(/^packages\/engine\/src\//, '');

  const names = retained.get(relative) ?? [];

  return names.includes(name);
}
