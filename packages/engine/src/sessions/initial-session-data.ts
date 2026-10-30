import type { SessionMachineInput } from './session-context';
import type { SessionData } from './session-data';

type Identity = Pick<
  SessionData,
  'sessionId' | 'projectId' | 'agent' | 'vendorSessionId' | 'checkout'
>;

type Progress = Omit<SessionData, keyof Identity>;

const identity = (input: SessionMachineInput): Identity => ({
  sessionId: input.sessionId,
  projectId: input.kind === 'new' ? input.projectId : '',
  agent: input.kind === 'new' ? input.agent : '',
  vendorSessionId: null,
  checkout: { path: '', branch: null },
});

const progress = (): Progress => ({
  configValues: [],
  heldConfig: [],
  epoch: 0,
  maxRevision: 0,
  activityAt: 0,
  nextPosition: 0,
  kept: false,
  undisclosedInterruptedTurnId: null,
});

export const initialSessionData = (
  input: SessionMachineInput,
): SessionData => ({
  ...identity(input),
  ...progress(),
});
