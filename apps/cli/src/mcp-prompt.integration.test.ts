import { createRuntimePlugins } from '@repo/engine/mocks/runtime-plugins';
import { expect, it } from 'vitest';
import { connectMcp } from '../mocks/mcp-client';
import { startCliHost } from '../mocks/operations-cli';

it('serves a create-plugin prompt that names the Operations and holds none of their content', async () => {
  const home = await createRuntimePlugins([
    { id: 'quiet', fixture: 'healthy' },
  ]);

  const host = await startCliHost({ home });
  const client = await connectMcp(host.home);

  expect((await client.listPrompts()).prompts).toMatchObject([
    { name: 'create-plugin' },
  ]);

  const { messages } = await client.getPrompt({ name: 'create-plugin' });

  expect(messages).toEqual([
    {
      role: 'user',
      content: {
        type: 'text',
        text: expect.stringMatching(/plugin\.guide.*plugin\.new/s),
      },
    },
  ]);
}, 30_000);
