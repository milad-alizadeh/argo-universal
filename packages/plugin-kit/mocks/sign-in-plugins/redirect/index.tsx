import { Screen, Text, type Argo } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { defineAccount, SignInGate } from '@argo/plugin-kit/sign-in';

const service = defineAccount({
  host: 'api.service.example',
  name: 'Service',
  flow: 'redirect',
  clientId: 'fixture-client',
  authorizeUrl: 'https://auth.service.example/authorize',
  tokenUrl: 'https://auth.service.example/token',
  label: { url: 'https://api.service.example/me', field: 'login' },
});

function Items(): JSX.Element {
  const { data } = service.useData(
    { url: 'https://api.service.example/items', method: 'GET' },
    { every: 60_000 },
  );

  return (
    <Screen title="Items">
      <Text>{data?.body ?? 'Loading'}</Text>
    </Screen>
  );
}

export async function register(argo: Argo): Promise<void> {
  await service.register(argo);
  argo.pages.register('/', () => (
    <SignInGate account={service}>
      <Items />
    </SignInGate>
  ));
}
