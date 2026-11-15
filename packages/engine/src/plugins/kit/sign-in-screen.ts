import type { SignInData } from '@repo/contracts/plugins/sign-in-api';
import type { ReactElement } from 'react';
import { jsx } from './jsx-runtime';
import { failureOf, tokenField } from './sign-in-paste';
import { stepOf, type Step } from './sign-in-step';

type Pressed = Parameters<typeof jsx>[1][string];

// What the screen draws and the Operations its buttons run, as values the App acts on (ADR-0050).
export type SignInParts = {
  name: string;
  data: SignInData;
  start: Pressed;
  cancel: Pressed;
  paste: Pressed;
};

const msPerMinute = 60_000;

const text = (role: string, content: string): ReactElement =>
  jsx('Text', { role, children: content });

const lines = (primary: string, secondary?: string): ReactElement[] =>
  secondary
    ? [text('secondary', primary), text('secondary', secondary)]
    : [text('secondary', primary)];

const button = (
  label: string,
  onPress: Pressed,
  variant?: string,
): ReactElement =>
  jsx('Button', { label, onPress, ...(variant && { variant }) });

const handOver = (name: string): ReactElement[] =>
  lines(
    'Continue on the Server Device',
    `Open ${name} in Argo on the Server Device to sign in. This device will update when you’re done.`,
  );

const canStart = ({ data }: SignInParts): boolean => !data.needsServerDevice;

const start = (parts: SignInParts, label: string): ReactElement[] =>
  canStart(parts) ? [button(label, parts.start)] : handOver(parts.name);

type Coded = Extract<Step, { kind: 'code' }>;

const codeButtons = (parts: SignInParts, step: Coded): ReactElement[] => [
  button(`Open ${parts.name}`, {
    action: 'openUrl',
    url: step.verificationUri,
  }),
  button('Copy code', { action: 'copy', text: step.userCode }, 'secondary'),
  button('Cancel', parts.cancel, 'secondary'),
];

const codeStep = (parts: SignInParts, step: Coded): ReactElement[] => [
  ...lines(
    `Enter this code on ${parts.name}, on any device.`,
    `The code lasts ${Math.round(step.lifetimeMs / msPerMinute)} minutes. Waiting for ${parts.name}…`,
  ),
  text('code', step.userCode),
  ...codeButtons(parts, step),
];

type Ended = Extract<Step, { kind: 'ended' }>;

const endStep = (parts: SignInParts, step: Ended): ReactElement[] => [
  ...lines(step.title, step.message),
  ...(canStart(parts) ? [button('Try again', parts.start)] : []),
];

type Waiting = Extract<Step, { kind: 'requesting' | 'waiting' }>;

const waitingStep = (parts: SignInParts, step: Waiting): ReactElement[] =>
  step.kind === 'requesting'
    ? lines(`Asking ${parts.name} for a code…`)
    : [
        ...lines(
          `Finish signing in in your browser. Waiting for ${parts.name}…`,
        ),
        button('Cancel', parts.cancel, 'secondary'),
      ];

const signedInStep = (
  step: Extract<Step, { kind: 'signed-in' }>,
): ReactElement[] =>
  lines(
    `Signed in as ${step.label}`,
    'Manage this Account in Settings › Accounts.',
  );

const invitation = (parts: SignInParts): string =>
  parts.data.rejected ?? `Sign in to use ${parts.name} in Argo.`;

const idleStep = (parts: SignInParts): ReactElement[] => [
  ...lines(invitation(parts)),
  ...start(parts, `Sign in to ${parts.name}`),
];

type Plain = Exclude<Step, Coded | Ended>;

function plainStep(parts: SignInParts, step: Plain): ReactElement[] {
  if (step.kind === 'signed-in') return signedInStep(step);

  return step.kind === 'idle' ? idleStep(parts) : waitingStep(parts, step);
}

// A token paste draws its field until it is signed in; a refused token's reason stays beside it.
function pasteBody(parts: SignInParts): ReactElement[] {
  const state = parts.data.flow;

  if (state.kind === 'signed-in') return signedInStep(state);

  return [
    ...lines(
      invitation(parts),
      `Paste an API token you made at ${parts.name}. Argo keeps it in your computer’s secret store.`,
    ),
    tokenField(parts, failureOf(state)),
  ];
}

function flowBody(parts: SignInParts): ReactElement[] {
  const step = stepOf(parts.data.flow);

  if (step.kind === 'code') return codeStep(parts, step);

  return step.kind === 'ended' ? endStep(parts, step) : plainStep(parts, step);
}

const body = (parts: SignInParts): ReactElement[] =>
  parts.data.pastesToken ? pasteBody(parts) : flowBody(parts);

// The sign-in page, drawn from kit components: every step of each flow, and the way back after a refusal.
export const signInScreen = (parts: SignInParts): ReactElement =>
  jsx('Screen', {
    title: parts.name,
    children: jsx('Stack', {
      direction: 'column',
      gap: 6,
      children: body(parts),
    }),
  });
