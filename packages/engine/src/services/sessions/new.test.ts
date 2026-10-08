import type { SessionNewOutput } from '@repo/contracts';
import { expect, it } from 'vitest';
import { unreachableServices } from '#mocks/services';
import { appRouter } from '../../engine/router';

it('accepts the first prompt and initial choices together and returns only the Session id', async (): Promise<void> => {
  const caller = appRouter.createCaller({
    services: unreachableServices({
      session: {
        new: async (): Promise<SessionNewOutput> => ({
          sessionId: 'session-1',
        }),
      },
    }),
  });
  await expect(
    caller.session.new({
      projectId: 'project-1',
      agent: 'agent-one',
      checkout: { type: 'worktree', baseBranch: 'feature' },
      configOptions: [{ configId: 'model', value: 'small' }],
      prompt: [{ type: 'text', text: 'Build it' }],
    }),
  ).resolves.toEqual({ sessionId: 'session-1' });
});

it.each([
  { checkout: { type: 'worktree' } },
  { checkout: 'main' },
  { prompt: [] },
  { configOptions: [{ id: 'model', value: 'small' }] },
  {
    prompt: [{ type: 'resource_link', name: 'File', uri: 'file:///repo/file' }],
  },
])(
  'rejects incomplete or obsolete New Session inputs: %j',
  async (invalid): Promise<void> => {
    const caller = appRouter.createCaller({ services: unreachableServices() });
    await expect(
      Reflect.apply(caller.session.new, undefined, [
        {
          projectId: 'project-1',
          agent: 'agent-one',
          checkout: { type: 'main' },
          configOptions: [],
          prompt: [{ type: 'text', text: 'Build it' }],
          ...invalid,
        },
      ]),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  },
);

it('accepts image content and boolean config choices in the initial prompt', async (): Promise<void> => {
  const caller = appRouter.createCaller({
    services: unreachableServices({
      session: {
        new: async (): Promise<SessionNewOutput> => ({
          sessionId: 'image-session',
        }),
      },
    }),
  });
  await expect(
    caller.session.new({
      projectId: 'project-1',
      agent: 'agent-one',
      checkout: { type: 'main' },
      configOptions: [{ configId: 'feature', value: true }],
      prompt: [
        {
          type: 'image',
          mimeType: 'image/png',
          blob: { blobId: 'image-1', mime: 'image/png', bytes: 3 },
        },
      ],
    }),
  ).resolves.toEqual({ sessionId: 'image-session' });
});
