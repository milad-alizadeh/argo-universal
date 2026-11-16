import type { SignInData } from '@repo/contracts/plugins/sign-in-api';
import type { ReactElement } from 'react';
import { jsx } from './jsx-runtime';
import {
  actionRow,
  cardParts,
  valueRow,
  type Card,
  type Pressed,
} from './sign-in-card';
import { stepOf, type Step } from './sign-in-step';

// What the screen draws and the Operations its rows run, as values the App acts on (ADR-0050).
export type SignInParts = {
  name: string;
  data: SignInData;
  start: Pressed;
  cancel: Pressed;
};

const msPerMinute = 60_000;

const handOver = (name: string): Card => ({
  title: 'Continue on the Server Device',
  line: `Open ${name} in Argo on the Server Device to sign in. This device updates when you’re done.`,
});

const canStart = ({ data }: SignInParts): boolean => !data.needsServerDevice;

const idleStep = (parts: SignInParts): Card =>
  canStart(parts)
    ? {
        title: 'Connect your account',
        line: parts.data.rejected ?? `Sign in to use ${parts.name} in Argo.`,
        rows: [
          valueRow('Account', 'Not signed in'),
          actionRow(`Sign in to ${parts.name}`, parts.start),
        ],
        footer: 'Opens your browser. The token stays on the Server Device.',
      }
    : handOver(parts.name);

type Coded = Extract<Step, { kind: 'code' }>;

const codeStep = (parts: SignInParts, step: Coded): Card => ({
  title: `Enter this code on ${parts.name}`,
  line: `${parts.name} asks for it after you continue.`,
  code: step.userCode,
  rows: [
    actionRow(`Copy code and continue to ${parts.name}`, {
      action: 'openUrl',
      url: step.verificationUri,
      copy: step.userCode,
    }),
    actionRow('Cancel', parts.cancel),
  ],
  footer: `Waiting for ${parts.name}… The code lasts ${Math.round(step.lifetimeMs / msPerMinute)} minutes.`,
});

type Ended = Extract<Step, { kind: 'ended' }>;

const endStep = (parts: SignInParts, step: Ended): Card => ({
  title: step.title,
  line: step.message,
  ...(canStart(parts) && { rows: [actionRow('Try again', parts.start)] }),
});

type Waiting = Extract<Step, { kind: 'requesting' | 'waiting' }>;

const waitingStep = (parts: SignInParts, step: Waiting): Card =>
  step.kind === 'requesting'
    ? { title: `Asking ${parts.name} for a code…` }
    : {
        title: 'Finish in your browser',
        line: `Approve Argo on ${parts.name}. This page updates when you’re done.`,
        rows: [actionRow('Cancel', parts.cancel)],
      };

const signedInStep = (step: Extract<Step, { kind: 'signed-in' }>): Card => ({
  title: 'Connected',
  line: `Signed in as ${step.label}`,
  footer: 'Manage this Account in Settings › Accounts.',
  signedIn: true,
});

type Plain = Exclude<Step, Coded | Ended>;

function plainStep(parts: SignInParts, step: Plain): Card {
  if (step.kind === 'signed-in') return signedInStep(step);

  return step.kind === 'idle' ? idleStep(parts) : waitingStep(parts, step);
}

function stepCard(parts: SignInParts): Card {
  const step = stepOf(parts.data.flow);

  if (step.kind === 'code') return codeStep(parts, step);

  return step.kind === 'ended' ? endStep(parts, step) : plainStep(parts, step);
}

// The sign-in page, laid out as Settings is: every step of either flow, and the way back after a refusal.
export const signInScreen = (parts: SignInParts): ReactElement =>
  jsx('Screen', {
    title: parts.name,
    children: cardParts(parts.name, stepCard(parts)),
  });
