import type { ConfigValues } from './config-options';
import type {
  TurnStartParams,
  TurnStartResponse,
  TurnInterruptParams,
  TurnInterruptResponse,
} from './protocol.gen';
import {
  type VendorSessionState,
  type VendorTurn,
  createVendorTurn,
} from './vendor-session-state';
const sandboxPolicy = (
  values: ConfigValues,
): NonNullable<TurnStartParams['sandboxPolicy']> =>
  values.mode === 'fullAccess'
    ? { type: 'dangerFullAccess' }
    : {
        type: 'workspaceWrite',
        writableRoots: [],
        networkAccess: false,
        excludeTmpdirEnvVar: false,
        excludeSlashTmp: false,
      };
const collaborationMode = (
  values: ConfigValues,
): NonNullable<TurnStartParams['collaborationMode']> => ({
  mode: values.mode === 'plan' ? 'plan' : 'default',
  settings: {
    model: values.model,
    reasoning_effort: values.effort,
    developer_instructions: null,
  },
});
const turnInput = (
  state: VendorSessionState,
  content: TurnStartParams['input'],
  values: ConfigValues,
): TurnStartParams => ({
  threadId: state.vendorSessionId ?? '',
  input: content,
  model: values.model,
  effort: values.effort,
  summary: 'detailed',
  approvalPolicy: values.mode === 'fullAccess' ? 'never' : 'on-request',
  sandboxPolicy: sandboxPolicy(values),
  collaborationMode: collaborationMode(values),
});
const finishResponse = (state: VendorSessionState, turn: VendorTurn): void => {
  turn.completed = true;
  turn.completion.resolve();
  state.activeTurn = null;
};
interface TurnResponseInput {
  state: VendorSessionState;
  turn: VendorTurn;
  result: TurnStartResponse;
}
const acceptResponse = (input: TurnResponseInput): void => {
  if (input.state.activeTurn !== input.turn) return;
  if (input.result.turn.status !== 'inProgress') {
    finishResponse(input.state, input.turn);
    return;
  }
  input.turn.id = input.result.turn.id;
  input.turn.identity.resolve(input.turn.id);
};
export const prompt = async (
  state: VendorSessionState,
  content: TurnStartParams['input'],
  values: ConfigValues,
): Promise<void> => {
  const turn = createVendorTurn();
  state.activeTurn = turn;
  try {
    const response = promptResponse({ state, turn, content, values });
    await Promise.race([response, turn.completion.promise]);
  } finally {
    turn.identity.resolve(null);
  }
};
const interruptTurn = async (
  state: VendorSessionState,
  turn: VendorTurn,
  turnId: string,
): Promise<void> => {
  try {
    await (state.server.request('turn/interrupt', {
      threadId: vendorSessionId(state),
      turnId,
    } satisfies TurnInterruptParams) satisfies Promise<TurnInterruptResponse>);
  } catch (error) {
    if (!turn.completed) throw error;
  }
};
const waitForIdentity = async (
  state: VendorSessionState,
  turn: VendorTurn,
): Promise<void> => {
  const turnId = await turn.identity.promise;
  if (!turnId) return;
  if (state.activeTurn !== turn) return;
  await interruptTurn(state, turn, turnId);
};
export const interrupt = (
  state: VendorSessionState,
  turn: VendorTurn,
): Promise<void> => (turn.interrupted ??= waitForIdentity(state, turn));
export const cancel = async (state: VendorSessionState): Promise<void> => {
  try {
    if (state.activeTurn) await interrupt(state, state.activeTurn);
  } finally {
    state.cancelRequests();
  }
};

const promptResponse = (input: {
  state: VendorSessionState;
  turn: VendorTurn;
  content: TurnStartParams['input'];
  values: ConfigValues;
}): Promise<void> =>
  input.state.server
    .request('turn/start', turnInput(input.state, input.content, input.values))
    .then((result): void => acceptResponse({ ...input, result }));

const vendorSessionId = (state: VendorSessionState): string =>
  state.vendorSessionId ?? '';
