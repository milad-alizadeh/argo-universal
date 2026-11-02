import {
  Button,
  Screen,
  Text,
  useEffect,
  useState,
  type Argo,
} from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { defineAccount, SignInGate } from '@argo/plugin-kit/sign-in';

const service = defineAccount({
  host: 'api.service.example',
  name: 'Service',
  flow: 'device',
  clientId: 'fixture-client',
  deviceUrl: 'https://auth.service.example/device',
  tokenUrl: 'https://auth.service.example/token',
  label: { url: 'https://api.service.example/me', field: 'login' },
});

const read = { url: 'https://api.service.example/items', method: 'GET' } as const;

function Items(): JSX.Element {
  const { data } = service.useData(read, { every: 60_000 });

  return (
    <Screen title="Items">
      <Text>{data?.body ?? 'Loading'}</Text>
    </Screen>
  );
}

// A read with no gate, or one naming a Project no one registered: what the author sees.
function Answer({ projectId }: { projectId?: string }): JSX.Element {
  const { data, error, errorKind } = service.useData(read, { projectId });

  return (
    <Screen title="Answer">
      <Text>{errorKind ? `${errorKind}: ${error}` : (data?.body ?? 'Loading')}</Text>
    </Screen>
  );
}

function AccountAnswer({ argo }: { argo: Argo }): JSX.Element {
  const [answer, setAnswer] = useState('Loading');

  useEffect(() => {
    void argo.accounts.get(service.declaration.host).then(
      (account) => setAnswer(`account: ${account?.label ?? 'none'}`),
      (cause: Error) => setAnswer(`refused: ${cause.message}`),
    );
  }, []);

  return (
    <Screen title="Account">
      <Text>{answer}</Text>
    </Screen>
  );
}

// Loses the token of the Account this page's Project uses, as a wiped Keychain would.
function LoseToken({ argo }: { argo: Argo }): JSX.Element {
  const lose = async (): Promise<void> => {
    const account = await argo.accounts.get(service.declaration.host);

    if (account) await argo.secrets.delete(account.id);
  };

  return (
    <Screen title="Lose token">
      <Button label="Lose the token" onPress={() => void lose()} />
    </Screen>
  );
}

export async function register(argo: Argo): Promise<void> {
  await service.register(argo);
  argo.pages.register('/answer', () => <Answer />);
  argo.pages.register('/gated-answer', () => (
    <SignInGate account={service}>
      <Answer projectId="missing" />
    </SignInGate>
  ));
  argo.pages.register('/account', () => <AccountAnswer argo={argo} />);
  argo.pages.register('/lose-token', () => <LoseToken argo={argo} />);
  argo.pages.register('/', () => (
    <SignInGate account={service}>
      <Items />
    </SignInGate>
  ));
}
