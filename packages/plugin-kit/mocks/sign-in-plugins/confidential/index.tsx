import {
  accountFetch,
  oauthFlow,
  provideSignIn,
  Screen,
  signInGate,
  Text,
  type Argo,
  type GatedPage,
  type PageState,
} from '@argo/plugin-kit';

const service = { name: 'Service' };

// A secret Setting the person filled in; Argo ships no client secret.
async function clientSecret(argo: Argo): Promise<string | null> {
  const secret = await argo.settings.get('client-secret');

  return typeof secret === 'string' ? secret : null;
}

async function readItems(argo: Argo): Promise<string> {
  const reply = await accountFetch(
    argo,
    'api.service.example',
  )('https://api.service.example/items');

  return reply.text();
}

const itemsPage = (argo: Argo): GatedPage<PageState, string> => ({
  load: () => readItems(argo),
  render: (text) => (
    <Screen title="Items">
      <Text>{text}</Text>
    </Screen>
  ),
});

// A service that needs a client secret on every exchange and refresh, and rotates its refresh tokens.
export async function register(argo: Argo): Promise<void> {
  const flow = oauthFlow(argo, {
    host: 'api.service.example',
    authorizeUrl: 'https://auth.service.example/authorize',
    tokenUrl: 'https://auth.service.example/token',
    clientId: 'fixture-client',
    clientSecret: () => clientSecret(argo),
    label: async () => 'person',
  });

  await provideSignIn(argo, flow, service);
  argo.operations.register('readItems', async () => ({
    items: await readItems(argo),
  }));
  argo.pages.define('/', signInGate(flow, service, itemsPage(argo)));
}
