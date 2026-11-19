import type { SignInData } from '@repo/contracts/plugins/sign-in-api';
import { jsx } from './jsx-runtime';
import { valuesOf } from './render-tree';
import type { Pressed } from './sign-in-card';
import { signInScreen, type SignInParts } from './sign-in-screen';

const run = (operation: string): Pressed => ({ operation, args: {} });

const idleSection: SignInData = {
  flow: { kind: 'idle' },
  rejected: null,
  needsServerDevice: false,
  pastesToken: false,
};

const shared = {
  name: 'Jira',
  start: run('signIn'),
  cancel: run('cancelSignIn'),
  paste: run('signIn'),
};

const fields = [
  jsx(
    'FieldGroup.TextField',
    { title: 'Email', value: '', onChangeText: { bind: 'email' } },
    'email',
  ),
  jsx(
    'FieldGroup.TextField',
    { title: 'Jira site', value: '', onChangeText: { bind: 'site' } },
    'site',
  ),
];

function combined(
  patch: Partial<SignInData>,
  oauth: Partial<SignInData> = {},
): ReturnType<typeof valuesOf> {
  const sections: SignInParts[] = [
    {
      ...shared,
      data: { ...idleSection, pastesToken: true, ...patch },
      fields,
    },
    { ...shared, data: { ...idleSection, ...oauth } },
  ];

  return valuesOf(signInScreen(sections));
}

export const combinedSteps = {
  combined: combined({}),
  combinedRejected: combined({
    rejected: 'Jira no longer accepts this sign-in.',
  }),
  combinedWaiting: combined({}, { flow: { kind: 'waiting' } }),
  combinedPaired: combined({}, { needsServerDevice: true }),
  combinedPasteRefused: combined({
    flow: {
      kind: 'failed',
      reason: 'rejected',
      message: 'Jira didn’t accept that token.',
    },
  }),
  combinedOAuthFailed: combined(
    {},
    {
      flow: {
        kind: 'failed',
        reason: 'failed',
        message: 'Couldn’t start sign-in.',
      },
    },
  ),
};
