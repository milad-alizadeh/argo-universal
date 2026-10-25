import {
  Screen,
  Stack,
  Text,
  useEffect,
  useState,
  type Argo,
  type PluginRenderContext,
} from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { accountHost, type SignInResult } from './github-oauth';
import { Body, type Actions } from './sign-in-body';
import { chooseView, flowOf, type Account, type Flow } from './sign-in-view';

type Props = {
  context: PluginRenderContext;
  accounts: Pick<Argo['accounts'], 'get'>;
  signIn: () => Promise<SignInResult>;
};

type AccountState = { account: Account | null; refresh: () => void };

type FlowState = { flow: Flow; actions: Actions };

// This Project's Account, read again each time `reload` changes.
function useAccount(accounts: Props['accounts']): AccountState {
  const [account, setAccount] = useState<Account | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    // A failed read is the same as no Account: signing in is the way forward.
    void accounts
      .get(accountHost)
      .catch(() => null)
      .then(setAccount);
  }, [accounts, reload]);

  return { account, refresh: () => setReload((count) => count + 1) };
}

// Argo cannot cancel an exchange, so Cancel only makes this attempt's answer unwanted.
const settle =
  (attempt: symbol, result: SignInResult) =>
  (now: Flow): Flow =>
    now.kind === 'waiting' && now.attempt === attempt ? flowOf(result) : now;

function useFlow(signIn: Props['signIn'], refresh: () => void): FlowState {
  const [flow, setFlow] = useState<Flow>({ kind: 'idle' });

  const start = (): void => {
    const attempt = Symbol('attempt');

    setFlow({ kind: 'waiting', attempt });
    void signIn().then((result) => {
      setFlow(settle(attempt, result));
      refresh();
    });
  };

  return { flow, actions: { start, cancel: () => setFlow({ kind: 'idle' }) } };
}

export function SignInPage({ context, accounts, signIn }: Props): JSX.Element {
  const { account, refresh } = useAccount(accounts);
  const { flow, actions } = useFlow(signIn, refresh);
  const { serverDevice } = context;
  const view = chooseView({ account, serverDevice, flow });

  return (
    <Screen title="Plugin sign-in">
      <Stack direction="column" gap={6}>
        <Text role="title">GitHub</Text>
        <Body view={view} {...actions} />
      </Stack>
    </Screen>
  );
}
