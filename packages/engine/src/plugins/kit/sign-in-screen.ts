import type {
  SignInData,
  SignInOptions,
} from '@repo/contracts/plugins/sign-in-api';
import type { ReactElement } from 'react';
import { jsx } from './jsx-runtime';
import {
  actionRow,
  cancelRow,
  destructiveRow,
  signIn,
  valueRow,
  type Card,
  type Pressed,
} from './sign-in-card';
import { failureOf, secretField } from './sign-in-paste';
import { stepOf, type Step } from './sign-in-step';

// What the screen draws and the Operations its rows run, as values the App acts on (ADR-0050).
export type SignInParts = {
  name: string;
  logo?: SignInOptions['logo'];
  data: SignInData;
  start: Pressed;
  cancel: Pressed;
  paste: Pressed;
};

const msPerMinute = 60_000;

const handOver = (name: string): Card => ({
  title: 'Continue on the Server Device',
  description: `Open ${name} in Argo on the Server Device to sign in. This device updates when you’re done.`,
});

// What the page asks for first, or why the service refused the last sign-in.
const invitation = (parts: SignInParts): string =>
  parts.data.rejected ?? `Sign in to use ${parts.name} in Argo.`;

const canStart = ({ data }: SignInParts): boolean => !data.needsServerDevice;

const idleStep = (parts: SignInParts): Card =>
  canStart(parts)
    ? {
        title: 'Connect your account',
        description: invitation(parts),
        rows: [actionRow(`Sign in to ${parts.name}`, parts.start)],
        footer: 'Opens your browser. The token stays on the Server Device.',
      }
    : handOver(parts.name);

type Coded = Extract<Step, { kind: 'code' }>;

const codeStep = (parts: SignInParts, step: Coded): Card => ({
  title: `Enter this code on ${parts.name}`,
  description: `${parts.name} asks for it after you continue.`,
  rows: [
    valueRow('Code', step.userCode),
    actionRow(`Copy code and continue to ${parts.name}`, {
      action: 'openUrl',
      url: step.verificationUri,
      copy: step.userCode,
    }),
    cancelRow(parts.cancel),
  ],
  footer: `Waiting for ${parts.name}… The code lasts ${Math.round(step.lifetimeMs / msPerMinute)} minutes.`,
});

type Ended = Extract<Step, { kind: 'ended' }>;

const endStep = (parts: SignInParts, step: Ended): Card => ({
  title: step.title,
  description: step.message,
  ...(canStart(parts) && { rows: [actionRow('Try again', parts.start)] }),
});

type Waiting = Extract<Step, { kind: 'requesting' | 'waiting' }>;

const waitingStep = (parts: SignInParts, step: Waiting): Card =>
  step.kind === 'requesting'
    ? { title: `Asking ${parts.name} for a code…` }
    : {
        title: 'Finish in your browser',
        description: `Approve Argo on ${parts.name}. This page updates when you’re done.`,
        rows: [cancelRow(parts.cancel)],
      };

// Signing out is Settings' to do, since other Plugins may borrow the Account (ADR-0036): the row opens it there.
const signedInStep = (step: Extract<Step, { kind: 'signed-in' }>): Card => ({
  title: 'Connected',
  rows: [
    valueRow('Account', step.label),
    destructiveRow('Sign out…', {
      action: 'openAccount',
      accountId: step.accountId,
    }),
  ],
  footer:
    'Sign out in Settings › Accounts, where every Plugin using this Account is listed.',
  signedIn: true,
});

type Plain = Exclude<Step, Coded | Ended>;

function plainStep(parts: SignInParts, step: Plain): Card {
  if (step.kind === 'signed-in') return signedInStep(step);

  return step.kind === 'idle' ? idleStep(parts) : waitingStep(parts, step);
}

const pasteInvitation = (parts: SignInParts): string =>
  parts.data.rejected ??
  `Paste an API token you made at ${parts.name}. Argo keeps it in your computer’s secret store.`;

// The field a token is pasted into, with a refused token's reason as the footer under it.
function fieldCard(parts: SignInParts): Card {
  const error = failureOf(parts.data.flow);

  return {
    title: 'Connect your account',
    description: pasteInvitation(parts),
    rows: [secretField(parts, error)],
    ...(error && { footer: error }),
  };
}

// A token paste draws its field until it is signed in, on every Device, never handing over.
const pasteCard = (parts: SignInParts): Card =>
  parts.data.flow.kind === 'signed-in'
    ? signedInStep(parts.data.flow)
    : fieldCard(parts);

function flowCard(parts: SignInParts): Card {
  const step = stepOf(parts.data.flow);

  if (step.kind === 'code') return codeStep(parts, step);

  return step.kind === 'ended' ? endStep(parts, step) : plainStep(parts, step);
}

// The sign-in page, laid out as Settings is: every step of either flow, and the way back after a refusal.
export const signInScreen = (parts: SignInParts): ReactElement =>
  jsx('Screen', {
    title: parts.name,
    children: signIn(
      parts,
      parts.data.pastesToken ? pasteCard(parts) : flowCard(parts),
    ),
  });
