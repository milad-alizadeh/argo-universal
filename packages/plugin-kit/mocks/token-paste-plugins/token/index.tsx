import {
  accountFetch,
  provideSignIn,
  Screen,
  signInGate,
  Text,
  tokenPaste,
  type Argo,
  type GatedPage,
  type PageState,
} from '@argo/plugin-kit';

const host = 'api.service.example';

const service = { name: 'Service' };

// The one read of the page: the Account is borrowed, so a signed-out person has no answer.
const itemsPage = (argo: Argo): GatedPage<PageState, string> => ({
  load: async () =>
    (await accountFetch(argo, host)(`https://${host}/items`)).text(),
  render: (text) => (
    <Screen title="Items">
      <Text>{text}</Text>
    </Screen>
  ),
});

// The sign-in, from here to the end of the file: whose token was pasted, or nothing when the service refuses it.
async function login(argo: Argo, token: string): Promise<string | null> {
  const headers = { Authorization: `Bearer ${token}` };
  const reply = await argo.fetch(`https://${host}/me`, { headers });
  const body: unknown = reply?.ok ? await reply.json() : null;

  return body && typeof body === 'object' && 'login' in body
    ? String(body.login)
    : null;
}

export async function register(argo: Argo): Promise<void> {
  const header = { header: 'Authorization', prefix: 'Bearer' };
  const flow = tokenPaste(argo, {
    host,
    header,
    label: (token) => login(argo, token),
  });

  await provideSignIn(argo, flow, service);
  argo.pages.define('/', signInGate(flow, service, itemsPage(argo)));
}
