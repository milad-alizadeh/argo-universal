import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { startAcpEngine } from '#mocks/acp-engine';
import { promptedArchiveSession } from '#mocks/archive';

let stop: (() => Promise<void>) | undefined;

afterEach(async () => {
  await stop?.();
  stop = undefined;
});

type OpenedSession = Awaited<ReturnType<typeof promptedArchiveSession>> & {
  host: Awaited<ReturnType<typeof startAcpEngine>>;
};

async function openedSession(): Promise<OpenedSession> {
  const host = await startAcpEngine({ steps: [] });
  stop = (): Promise<void> => host.stop();

  return { host, ...(await promptedArchiveSession(host)) };
}

const checkoutDirectory = 'plugins';

const pluginId = 'reading-list';

it('writes the one template into the Session’s Checkout under plugins/<id>', async () => {
  const { host, sessionId, path } = await openedSession();

  const made = await host.caller.plugin.new({ sessionId, id: pluginId });

  expect(made.path).toBe(join(checkoutDirectory, pluginId));
  expect(made.files).toEqual(
    expect.arrayContaining(['plugin.json', 'index.tsx', 'index.test.ts']),
  );
  expect(made.next.join('\n')).toContain(
    `pnpm --filter @argo/${pluginId} check`,
  );
  expect(
    JSON.parse(await readFile(join(path, made.path, 'plugin.json'), 'utf8')),
  ).toMatchObject({ id: pluginId, name: 'Reading List' });
});

it('never writes over a Plugin that is there, and says what to do', async () => {
  const { host, sessionId } = await openedSession();

  await host.caller.plugin.new({ sessionId, id: 'twice' });

  await expect(
    host.caller.plugin.new({ sessionId, id: 'twice' }),
  ).rejects.toThrow(
    `${checkoutDirectory}/twice already exists. Pick another id`,
  );
});

it('refuses an id that is not a Plugin id, naming the shape of one', async () => {
  const { host, sessionId } = await openedSession();

  await expect(
    host.caller.plugin.new({ sessionId, id: 'Not A Plugin' }),
  ).rejects.toThrow('lower-case letters, digits and dashes');
});

it('asks for a Session when no Session runs it', async () => {
  const { host } = await openedSession();

  await expect(host.caller.plugin.new({ id: 'no-session' })).rejects.toThrow(
    'pass sessionId',
  );
});

it.each(['Bob "B"', 'Notes {draft}', 'Back\\slash', 'Two\nlines', '<Notes>'])(
  'refuses the name %j, naming the characters a name may hold',
  async (name) => {
    const { host, sessionId } = await openedSession();

    await expect(
      host.caller.plugin.new({ sessionId, id: 'named', name }),
    ).rejects.toThrow('A Plugin name holds letters, digits, spaces');
  },
);

it('keeps an apostrophe and an ampersand in a name the manifest and the page both carry', async () => {
  const { host, sessionId, path } = await openedSession();

  const made = await host.caller.plugin.new({
    sessionId,
    id: 'bobs',
    name: 'Bob’s & Co',
  });

  expect(
    JSON.parse(await readFile(join(path, made.path, 'plugin.json'), 'utf8')),
  ).toMatchObject({ name: 'Bob’s & Co' });
});
