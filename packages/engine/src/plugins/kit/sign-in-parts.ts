import type {
  SignInFlow,
  SignInState,
} from '@repo/contracts/plugins/device-flow-api';
import type { PageTo } from '@repo/contracts/plugins/loader-page-api';
import type { PageState } from '@repo/contracts/plugins/page-address';
import type {
  CombinedSignInFlows,
  SignInData,
  SignInFlows,
  SignInOptions,
} from '@repo/contracts/plugins/sign-in-api';
import type { TokenPasteField } from '@repo/contracts/plugins/token-paste-api';
import type { ReactElement } from 'react';
import { jsx } from './jsx-runtime';
import { currentFlow, flowKey } from './sign-in-credentials';
import { signInScreen, type SignInParts } from './sign-in-screen';

export const isCombined = (flow: SignInFlows): flow is CombinedSignInFlows =>
  Array.isArray(flow);

const flowsOf = (flow: SignInFlows): readonly SignInFlow[] =>
  isCombined(flow) ? flow : [flow];

const stateOf = (state: SignInState, showConnected: boolean): SignInState =>
  state.kind === 'signed-in' && !showConnected ? { kind: 'idle' } : state;

export function signInData(
  flows: SignInFlows,
  serverDevice: boolean,
  rejected: string | null,
): SignInData[] {
  const latest = isCombined(flows) ? currentFlow(flows) : flowKey(flows);

  return flowsOf(flows).map((flow) => ({
    flow: stateOf(flow.state(), rejected === null && flowKey(flow) === latest),
    rejected,
    needsServerDevice: flow.serverDevice && !serverDevice,
    pastesToken: 'pastesToken' in flow,
  }));
}

export const fieldsOf = (flow: SignInFlow): readonly TokenPasteField[] =>
  'fields' in flow ? flow.fields : [];

type Draw = {
  to: Pick<PageTo<PageState>, 'bind' | 'run' | 'payload'>;
  state: PageState;
};

function fieldValue(state: PageState, key: string): string {
  const value = state[key];

  return typeof value === 'string' ? value : '';
}

function fieldRow(
  { key, title }: TokenPasteField,
  { state, to }: Draw,
): ReactElement {
  const props = {
    title,
    value: fieldValue(state, key),
    onChangeText: to.bind(key),
  };

  return jsx('FieldGroup.TextField', props, key);
}

const fieldValues = (
  fields: readonly TokenPasteField[],
  state: PageState,
): Record<string, string> =>
  Object.fromEntries(fields.map(({ key }) => [key, fieldValue(state, key)]));

type Selection = Record<string, string>;

function runsOf(
  flow: SignInFlow,
  draw: Draw,
  selection: Selection,
): Pick<SignInParts, 'start' | 'cancel' | 'paste' | 'fields'> {
  const fields = fieldsOf(flow);

  const values = fieldValues(fields, draw.state);

  const { to } = draw;

  return {
    start: to.run('signIn', selection),
    cancel: to.run('cancelSignIn', selection),
    paste: to.run('signIn', { ...selection, ...values, token: to.payload() }),
    fields: fields.map((field) => fieldRow(field, draw)),
  };
}

type SignInDraw = Draw & SignInOptions;

const flowSelection = (flows: SignInFlows, flow: SignInFlow): Selection =>
  isCombined(flows) ? { flow: flowKey(flow) } : {};

export function drawSignIn(
  flows: SignInFlows,
  data: readonly SignInData[],
  draw: SignInDraw,
): ReactElement {
  const options = { name: draw.name, logo: draw.logo };

  const parts = flowsOf(flows).flatMap((flow, index) => {
    const section = data[index];

    const selection = flowSelection(flows, flow);

    return section
      ? [{ ...options, data: section, ...runsOf(flow, draw, selection) }]
      : [];
  });

  return signInScreen(parts);
}
