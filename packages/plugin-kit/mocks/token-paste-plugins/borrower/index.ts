import type { Argo } from '@argo/plugin-kit';

// Borrows the Account the token-paste Plugin provides, for Project one, and answers what the service read.
export function register(argo: Argo): void {
  argo.operations.register('readItems', async () => {
    const reply = await argo.fetch('https://api.service.example/items', {
      account: 'api.service.example',
      projectId: 'one',
    });

    return reply ? reply.text() : null;
  });
}
