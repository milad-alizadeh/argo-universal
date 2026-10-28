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
  ['operations/router.ts', ['run']],
]);

// Spec 0022 #1314 removes this separate migration list as these become Operations.
const notYetMoved = new Map<string, readonly string[]>([
  [
    'sessions/router.ts',
    [
      'new',
      'prompt',
      'close',
      'cancel',
      'setConfigOption',
      'rename',
      'savePlan',
    ],
  ],
  ['sessions/archive/archive-router.ts', ['archive', 'unarchive']],
  ['sessions/shells/router.ts', ['stopShell']],
  ['plugins/router.ts', ['activate', 'setEnabled', 'setSetting']],
]);

export function permittedMutation(file: string, name: string): boolean {
  const relative = file.replace(/^packages\/engine\/src\//, '');

  const names = [
    ...(retained.get(relative) ?? []),
    ...(notYetMoved.get(relative) ?? []),
  ];

  return names.includes(name);
}
