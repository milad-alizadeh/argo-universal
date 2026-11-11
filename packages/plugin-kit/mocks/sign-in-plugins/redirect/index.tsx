import {
  oauthFlow,
  provideSignIn,
  Screen,
  signInGate,
  SignInRequired,
  Text,
  type Argo,
  type GatedPage,
  type PageState,
} from '@argo/plugin-kit';

const items = 'https://api.service.example/items';

// The one read of the page: the Account is borrowed, so a signed-out person has no answer.
async function readItems(argo: Argo, projectId: string | undefined): Promise<string> {
  const reply = await argo.fetch(items, { account: 'api.service.example', projectId });

  if (!reply || reply.status === 401) throw new SignInRequired('Sign in to Service.');

  return reply.text();
}

const service = { name: 'Service' };

const itemsPage = (argo: Argo): GatedPage<PageState, string> => ({
  load: ({ context }) => readItems(argo, context.projectId),
  render: (text) => (
    <Screen title="Items">
      <Text>{text}</Text>
    </Screen>
  ),
});

export async function register(argo: Argo): Promise<void> {
  const flow = oauthFlow(argo, {
    host: 'api.service.example',
    authorizeUrl: 'https://auth.service.example/authorize',
    tokenUrl: 'https://auth.service.example/token',
    clientId: 'fixture-client',
    label: async () => 'person',
  });

  await provideSignIn(argo, flow, service);
  argo.pages.define('/', signInGate(flow, service, itemsPage(argo)));
}
