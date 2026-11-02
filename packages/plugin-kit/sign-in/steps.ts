export type Ended = { kind: 'ended'; title: string; detail: string };

export type CodeStep = {
  kind: 'code';
  userCode: string;
  verificationUri: string;
  // When the service stops taking this code, and how long it had from the start, for the countdown.
  expiresAt: number;
  lifetimeMs: number;
};

// What the sign-in page draws as a flow goes.
export type SignInStep =
  | { kind: 'idle' }
  | { kind: 'requesting' }
  | CodeStep
  | { kind: 'browser' }
  | { kind: 'signed-in'; label: string }
  | Ended;

export const denied = (name: string): Ended => ({
  kind: 'ended',
  title: 'Sign-in was denied',
  detail: `You turned the request down on ${name}.`,
});

export const expired = (name: string, minutes: number): Ended => ({
  kind: 'ended',
  title: 'The code expired',
  detail: `${name} codes last ${minutes} minutes. Ask for a new one.`,
});

export const unfinished = (name: string): Ended => ({
  kind: 'ended',
  title: 'Sign-in did not finish',
  detail: `The browser did not come back from ${name}. You may have declined, or it took too long.`,
});

export const failed = (detail: string): Ended => ({
  kind: 'ended',
  title: 'Couldn’t sign in',
  detail,
});

// Why a page cannot read: no Account answered, the service refused the token, or no Project says which of several.
export type SignInNeed = 'no-account' | 'rejected' | 'several-accounts';

export type FlowRun = {
  show: (step: SignInStep) => void;
  cancelled: () => boolean;
};

export type StartedRun = FlowRun & {
  // The Project whose read sent the person here, whose choice the sign-in becomes. "Add account" names none.
  projectId?: string;
};
