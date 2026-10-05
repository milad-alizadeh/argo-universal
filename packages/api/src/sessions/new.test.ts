import { expect, it } from 'vitest';
import { unreachableServices } from '../../mocks';
import { appRouter } from '../root';

it('accepts the first prompt and initial choices together and returns only the Session id', async () => {
  const caller = appRouter.createCaller({
    services: unreachableServices({
      session: { new: async () => ({ sessionId: 'session-1' }) },
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
])('rejects incomplete or obsolete New Session inputs: %j', async (invalid) => {
  const caller = appRouter.createCaller({ services: unreachableServices() });
  await expect(
    caller.session.new({
      projectId: 'project-1',
      agent: 'agent-one',
      checkout: { type: 'main' },
      configOptions: [],
      prompt: [{ type: 'text', text: 'Build it' }],
      ...invalid,
    } as never),
  ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
});

it('accepts image content and boolean config choices in the initial prompt', async () => {
  const caller = appRouter.createCaller({
    services: unreachableServices({
      session: { new: async () => ({ sessionId: 'image-session' }) },
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
