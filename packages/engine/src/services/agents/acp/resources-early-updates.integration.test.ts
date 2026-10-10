import { expect, it } from 'vitest';
import {
  createResourcePeer,
  createResourceOpening,
  createResourceDestination,
  createResourceUpdate,
} from '#mocks/acp-resource';
import { createAcpResources } from '../index';

it('more than 64 early updates fail the opening resource instead of growing the buffer', async () => {
  const failures: unknown[] = [];
  const peer = createResourcePeer({
    newSession: async ({ client }) => {
      for (let index = 0; index < 65; index += 1)
        await client.notify('session/update', createResourceUpdate('early'));
      return { sessionId: 'early' };
    },
  });
  const resources = createAcpResources(peer);
  const opening = resources.open(
    createResourceOpening({
      ...createResourceDestination(),
      failed: (error) => {
        failures.push(error);
      },
    }),
  );
  await expect(opening).rejects.toBeDefined();
  expect(failures).toContainEqual(
    new Error('ACP early update buffer limit reached'),
  );
  await resources.shutdown();
});

it('early updates over 256 KB fail the opening resource before 64 arrive', async () => {
  const failures: unknown[] = [];
  const large = createResourceUpdate('early');
  const peer = createResourcePeer({
    newSession: async ({ client }) => {
      for (let index = 0; index < 3; index += 1)
        await client.notify('session/update', {
          ...large,
          update: {
            sessionUpdate: 'agent_message_chunk',
            content: { type: 'text', text: 'x'.repeat(100_000) },
          },
        });
      return { sessionId: 'early' };
    },
  });
  const resources = createAcpResources(peer);
  const opening = resources.open(
    createResourceOpening({
      ...createResourceDestination(),
      failed: (error) => {
        failures.push(error);
      },
    }),
  );
  await expect(opening).rejects.toBeDefined();
  expect(failures).toContainEqual(
    new Error('ACP early update buffer limit reached'),
  );
  await resources.shutdown();
});
