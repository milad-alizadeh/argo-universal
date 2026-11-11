import type { SignInState } from '@repo/contracts/plugins/device-flow-api';

/*
 * What the sign-in page draws, whichever flow it is: the steps of a device flow, and the redirect flow's wait for
 * the browser. A redirect flow's failure is an ended sign-in with the service's own words.
 */
export type Step =
  | { kind: 'idle' }
  | { kind: 'requesting' }
  | { kind: 'waiting' }
  | {
      kind: 'code';
      userCode: string;
      verificationUri: string;
      lifetimeMs: number;
    }
  | { kind: 'signed-in'; label: string }
  | { kind: 'ended'; title: string; message: string };

const endTitles = {
  denied: 'Sign-in was denied',
  expired: 'The code expired',
  failed: 'Couldn’t sign in',
} as const;

type Failed = Extract<SignInState, { kind: 'failed' }>;

const failedStep = (state: Failed): Step => ({
  kind: 'ended',
  title:
    state.reason === 'port-in-use'
      ? 'Couldn’t start sign-in'
      : endTitles.failed,
  message: state.message,
});

type Plain = Extract<
  SignInState,
  { kind: 'idle' | 'requesting' | 'waiting' | 'code' | 'signed-in' }
>;

const plainStep = (state: Plain): Step => state;

// The page's view of a flow's state.
export function stepOf(state: SignInState): Step {
  if (state.kind === 'failed') return failedStep(state);

  if (state.kind === 'ended')
    return {
      kind: 'ended',
      title: endTitles[state.end],
      message: state.message,
    };

  return plainStep(state);
}
