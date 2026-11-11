import { access, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type {
  PluginNewInput,
  PluginNewOutput,
} from '@repo/contracts/operations/plugin-guide';
import { pluginTemplate } from '@repo/contracts/plugins/plugin-template';
import { TRPCError } from '@trpc/server';
import type { OpenSessions } from './open-sessions';
import { requireWritableSession } from './session-command';

// A Plugin kept in a Checkout lives under `plugins/`, where the repository's workspace finds it.
const pluginsDirectory = 'plugins';

const wordsOf = (id: string): string =>
  id
    .split('-')
    .filter(Boolean)
    .map((word) => word.slice(0, 1).toUpperCase() + word.slice(1))
    .join(' ');

const exists = (path: string): Promise<boolean> =>
  access(path).then(
    () => true,
    () => false,
  );

const missingSession = (): TRPCError =>
  new TRPCError({
    code: 'BAD_REQUEST',
    message:
      'plugin.new writes into a Session’s Checkout: pass sessionId, the Session whose Checkout should hold the Plugin (session.list shows them). A Session that runs it needs no sessionId.',
  });

const taken = (path: string): TRPCError =>
  new TRPCError({
    code: 'CONFLICT',
    message: `${path} already exists. Pick another id, or edit that Plugin; plugin.new never overwrites.`,
  });

const steps = (id: string, path: string): string[] => [
  `Run pnpm install at the repository root, so ${path} finds @argo/plugin-kit.`,
  `Run pnpm --filter @argo/${id} check. It passes before you change anything.`,
  'Read plugin.guide, then turn the page into your Plugin.',
];

// The new Plugin's folder in the Session's Checkout, which must not be there yet.
async function newFolder(
  sessions: Pick<OpenSessions, 'queued'>,
  { id, sessionId }: PluginNewInput,
): Promise<{ path: string; directory: string }> {
  if (sessionId === undefined) throw missingSession();

  const { checkout } = requireWritableSession(sessions.queued(sessionId));
  const path = join(pluginsDirectory, id);
  const directory = join(checkout.path, path);

  if (await exists(directory)) throw taken(path);

  return { path, directory };
}

async function writeFiles(
  directory: string,
  files: [string, string][],
): Promise<void> {
  for (const [file, content] of files) {
    await mkdir(dirname(join(directory, file)), { recursive: true });
    await writeFile(join(directory, file), content);
  }
}

// Writes the one template into the Session's Checkout as a new folder, and never over one that is there.
export async function createPlugin(
  sessions: Pick<OpenSessions, 'queued'>,
  input: PluginNewInput,
): Promise<PluginNewOutput> {
  const { path, directory } = await newFolder(sessions, input);
  const files = pluginTemplate(input.id, input.name ?? wordsOf(input.id));

  await writeFiles(directory, files);

  return {
    path,
    files: files.map(([file]) => file),
    next: steps(input.id, path),
  };
}
