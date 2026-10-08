import type { Model } from './config-options';
import type {
  openAppServer,
  AccountIdentity,
  ModelListPage,
} from './open-app-server';

type AppServer = ReturnType<typeof openAppServer>;

// A ChatGPT login, not an API key or a cloud provider (ADR-0004).
export const usesChatGpt = (account: AccountIdentity | null): boolean =>
  account?.type === 'chatgpt';

// Initialises the app server and resolves to the account it runs on.
export async function initialize(
  server: AppServer,
): Promise<AccountIdentity | null> {
  await server.request('initialize', {
    clientInfo: { name: 'argo', title: 'Argo', version: '0.0.0' },
    capabilities: { experimentalApi: true, requestAttestation: false },
  });
  server.notify('initialized');
  const { account } = await server.request('account/read', {});
  return account;
}

// Every page of the model list, without the hidden models.
export async function readModels(server: AppServer): Promise<Model[]> {
  const models: Model[] = [];
  let cursor: string | null = null;
  do {
    const page: ModelListPage = await server.request(
      'model/list',
      cursor ? { cursor } : {},
    );
    models.push(...page.data.filter((model): boolean => !model.hidden));
    cursor = page.nextCursor;
  } while (cursor);
  return models;
}
