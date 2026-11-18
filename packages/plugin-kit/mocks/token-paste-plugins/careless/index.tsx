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

const host = 'api.careless.example';

const service = { name: 'Careless' };

const itemsPage = (argo: Argo): GatedPage<PageState, string> => ({
  load: async () =>
    (await accountFetch(argo, host)(`https://${host}/items`)).text(),
  render: (text) => (
    <Screen title="Items">
      <Text>{text}</Text>
    </Screen>
  ),
});

// A check that cannot reach its service, and names the token in its error, which the kit must never show.
const label = async (token: string): Promise<string | null> => {
  throw new Error(`Couldn’t reach ${host} with ${token}`);
};

export async function register(argo: Argo): Promise<void> {
  const header = { header: 'Authorization', prefix: 'Bearer' };
  const flow = tokenPaste(argo, { host, header, label });

  await provideSignIn(argo, flow, service);
  argo.pages.define('/', signInGate(flow, service, itemsPage(argo)));
}
