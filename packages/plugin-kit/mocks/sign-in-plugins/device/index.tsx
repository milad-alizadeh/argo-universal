import {
  accountFetch,
  deviceFlow,
  provideSignIn,
  Screen,
  signInGate,
  Text,
  type Argo,
  type GatedPage,
  type PageState,
} from '@argo/plugin-kit';

const items = 'https://api.service.example/items';

const service = { name: 'Service' };

// The one read of the page: the Account is borrowed, so a signed-out person has no answer.
const itemsPage = (argo: Argo): GatedPage<PageState, string> => ({
  load: async () =>
    (await accountFetch(argo, 'api.service.example')(items)).text(),
  render: (text) => (
    <Screen title="Items">
      <Text>{text}</Text>
    </Screen>
  ),
});

export async function register(argo: Argo): Promise<void> {
  const flow = deviceFlow(argo, {
    host: 'api.service.example',
    name: 'Service',
    clientId: 'fixture-client',
    deviceUrl: 'https://auth.service.example/device',
    tokenUrl: 'https://auth.service.example/token',
    label: { url: 'https://api.service.example/me', field: 'login' },
  });

  await provideSignIn(argo, flow, service);
  argo.pages.define('/', signInGate(flow, service, itemsPage(argo)));
}
