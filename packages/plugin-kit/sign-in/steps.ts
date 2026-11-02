export type Ended = { kind: 'ended'; title: string; detail: string };

// What the sign-in page draws as a flow goes.
export type SignInStep =
  | { kind: 'idle' }
  | { kind: 'requesting' }
  | { kind: 'code'; userCode: string; verificationUri: string }
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

// Why a page cannot read: no Account answered, or the service refused the token it was given.
export type SignInNeed = 'no-account' | 'rejected';

export type FlowRun = {
  show: (step: SignInStep) => void;
  cancelled: () => boolean;
};

export type StartedRun = FlowRun & {
  need: SignInNeed;
  // The Project whose read was rejected, which says whose token to rewrite.
  projectId?: string;
};
