import { join } from 'node:path';
import type {
  PluginNewInput,
  PluginNewOutput,
} from '@repo/contracts/operations/plugin-guide';
import { pluginTemplate } from '@repo/contracts/plugins/plugin-template';
import { TRPCError } from '@trpc/server';
import type { OpenSessions } from './open-sessions';
import { writePluginFolder, workspacePackageNames } from './plugin-folder';
import { requireWritableSession } from './session-command';

// A Plugin kept in a Checkout lives under `plugins/`, where the repository's workspace finds it.
const pluginsDirectory = 'plugins';

const wordsOf = (id: string): string =>
  id
    .split('-')
    .filter(Boolean)
    .map((word) => word.slice(0, 1).toUpperCase() + word.slice(1))
    .join(' ');

const missingSession = (): TRPCError =>
  new TRPCError({
    code: 'BAD_REQUEST',
    message:
      'plugin.new writes into a Session’s Checkout: pass sessionId, the Session whose Checkout should hold the Plugin (session.list shows them). A Session that runs it needs no sessionId.',
  });

const packageTaken = (id: string): TRPCError =>
  new TRPCError({
    code: 'CONFLICT',
    message: `@argo/${id} is already a package in this workspace. Pick another id, so the new Plugin's package name is its own.`,
  });

const steps = (id: string, path: string): string[] => [
  `Run pnpm install at the repository root, so ${path} finds @argo/plugin-kit.`,
  `Run pnpm --filter @argo/${id} check. It passes before you change anything.`,
  'Read plugin.guide, then turn the page into your Plugin.',
];

// The new Plugin's folder in the Session's Checkout, once its package name is its own.
async function newFolder(
  sessions: Pick<OpenSessions, 'queued'>,
  { id, sessionId }: PluginNewInput,
): Promise<{ path: string; directory: string }> {
  if (sessionId === undefined) throw missingSession();

  const { checkout } = requireWritableSession(sessions.queued(sessionId));
  const path = join(pluginsDirectory, id);

  const held = await workspacePackageNames(checkout.path, path);

  if (held.includes(`@argo/${id}`)) throw packageTaken(id);

  return { path, directory: join(checkout.path, path) };
}

// Writes the one template into the Session's Checkout as a new folder, and never over one that is there.
export async function createPlugin(
  sessions: Pick<OpenSessions, 'queued'>,
  input: PluginNewInput,
): Promise<PluginNewOutput> {
  const { path, directory } = await newFolder(sessions, input);
  const files = pluginTemplate(input.id, input.name ?? wordsOf(input.id));

  await writePluginFolder(directory, path, files);

  return {
    path,
    directory,
    files: files.map(([file]) => file),
    next: steps(input.id, path),
  };
}
