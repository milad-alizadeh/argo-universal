import type {
  SignInFlow,
  SignInState,
} from '@repo/contracts/plugins/device-flow-api';
import type { LoaderPage } from '@repo/contracts/plugins/loader-page-api';
import type { PageState } from '@repo/contracts/plugins/page-address';
import type {
  CombinedSignInArgo,
  ProvideSignInArgo,
  ProvideSignInPattern,
  SignInData,
  SignInFlows,
  ProvideSignInOptions,
} from '@repo/contracts/plugins/sign-in-api';
import { z } from 'zod';
import { flowKey, provideTogether } from './sign-in-credentials';
import { drawSignIn, isCombined, signInData } from './sign-in-parts';

const signInPage = (
  flow: SignInFlows,
  options: ProvideSignInOptions,
): LoaderPage<PageState, SignInData[]> => ({
  load: async ({ context }) => {
    const active = isCombined(flow) ? flow : [flow];

    const problem = active.some((entry) => entry.state().kind === 'signed-in')
      ? await options.connectionProblem?.()
      : null;

    return signInData(flow, context.serverDevice, problem ?? null);
  },
  render: (data, to, { state }) =>
    drawSignIn(flow, data, { ...options, to, state }),
});

const Params = z
  .object({ flow: z.string().optional(), token: z.string().optional() })
  .catchall(z.unknown());

type Params = z.infer<typeof Params>;

function selectFlow(flow: SignInFlows, key?: string): SignInFlow {
  if (!isCombined(flow)) return flow;

  const selected = flow.find((candidate) => flowKey(candidate) === key);

  if (!selected) throw new Error('Choose a sign-in flow');

  return selected;
}

function startFlow(
  flow: SignInFlow,
  { token = '', ...params }: Params,
): Promise<SignInState> {
  if (!('pastesToken' in flow)) return flow.start();

  const fields = Object.fromEntries(
    flow.fields.map(({ key }) => {
      const value = params[key];

      return [key, typeof value === 'string' ? value : ''];
    }),
  );

  return flow.start(token, fields);
}

type Registration = ProvideSignInArgo & Partial<CombinedSignInArgo>;

function registerProvider(
  argo: Registration,
  flow: SignInFlows,
): Promise<void> {
  if (!isCombined(flow)) return flow.provide();

  const { accounts, changed } = argo;

  if (!accounts) throw new Error('Combined sign-in needs the Account API');

  return provideTogether({ accounts, changed: changedOrNoop(changed) }, flow);
}

const changedOrNoop = (changed: Registration['changed']): (() => void) =>
  changed ?? (() => {});

export const provideSignIn: ProvideSignInPattern = async (
  argo: Registration,
  flow,
  options,
) => {
  argo.operations.register('signIn', async (args) => {
    const params = Params.parse(args);

    return { ...(await startFlow(selectFlow(flow, params.flow), params)) };
  });
  argo.operations.register('cancelSignIn', async (args) => ({
    ...(await selectFlow(flow, Params.parse(args).flow).cancel()),
  }));
  argo.pages.define(options.path ?? '/sign-in', signInPage(flow, options));

  await registerProvider(argo, flow);
};
