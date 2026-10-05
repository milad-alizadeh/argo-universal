import type { openAppServer } from './open-app-server';
import type { Model, ModelListResponse } from './protocol.gen';

type AppServer = ReturnType<typeof openAppServer>;

export const EXECUTABLE = 'codex';

// Initialises the app server and reports whether it runs on a ChatGPT account (ADR-0004).
export async function initialize(server: AppServer) {
  await server.request('initialize', {
    clientInfo: { name: 'argo', title: 'Argo', version: '0.0.0' },
    capabilities: { experimentalApi: true, requestAttestation: false },
  });
  server.notify('initialized');
  const { account } = await server.request('account/read', {});
  return { signedIn: account?.type === 'chatgpt' };
}

// Every page of the model list, without the hidden models.
export async function readModels(server: AppServer) {
  const models: Model[] = [];
  let cursor: string | null = null;
  do {
    const page: ModelListResponse = await server.request(
      'model/list',
      cursor ? { cursor } : {},
    );
    models.push(...page.data.filter((model) => !model.hidden));
    cursor = page.nextCursor;
  } while (cursor);
  return models;
}
