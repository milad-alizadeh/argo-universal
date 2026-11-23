import { constants } from 'node:fs';
import { access, open, realpath } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { TRPCError } from '@trpc/server';
import { parse, printParseErrorCode, type ParseError } from 'jsonc-parser';
import { z } from 'zod';
import { noFollow, stillAtPath } from './run-checkout-file';
import { validReadyPattern } from './run-configurations';

// A Run Configuration as drafted: the fields of `.argo/run.json` that a source can know.
export type Draft = {
  name: string;
  command: string;
  cwd?: string;
  env?: Record<string, string>;
  port?: number;
  ready?: { pattern: string };
};

export type SkippedDraft = { source: string; name: string; reason: string };

export type SourceDrafts = {
  source: string;
  drafts: Draft[];
  skipped: SkippedDraft[];
};

const highestPort = 65_535;

const storybookPort = 6006;

const exists = async (path: string): Promise<boolean> => {
  try {
    await access(path);

    return true;
  } catch {
    return false;
  }
};

const readIfPresent = async (
  checkout: string,
  file: string,
): Promise<string | undefined> => {
  try {
    const path = await realpath(join(checkout, file));
    const local = relative(checkout, path);

    if (isAbsolute(local) || local === '..' || local.startsWith(`..${sep}`))
      return undefined;

    await using handle = await open(path, constants.O_RDONLY | noFollow);

    return (await stillAtPath(path, await handle.stat()))
      ? await handle.readFile('utf8')
      : undefined;
  } catch {
    return undefined;
  }
};

const locatedError = (
  file: string,
  text: string,
  { offset, error }: ParseError,
): TRPCError => {
  const before = text.slice(0, offset).split('\n');

  const column = (before.at(-1)?.length ?? 0) + 1;

  return new TRPCError({
    code: 'BAD_REQUEST',
    message: `${[file, before.length, column].join(':')}: ${printParseErrorCode(error)}`,
  });
};

// Reads a JSON file with comments into the type wanted; a file of another type has nothing to draft, and a broken one says where.
async function readJson<Contents>(
  checkout: string,
  file: string,
  schema: z.ZodType<Contents>,
): Promise<Contents | undefined> {
  const text = await readIfPresent(checkout, file);

  if (text === undefined) return undefined;

  const errors: ParseError[] = [];

  const value: unknown = parse(text, errors, { allowTrailingComma: true });

  const [first] = errors;

  if (first) throw locatedError(file, text, first);

  const parsed = schema.safeParse(value);

  return parsed.success ? parsed.data : undefined;
}

const portIn = (value: number | string | undefined): number | undefined => {
  const port = typeof value === 'string' ? Number(value) : value;

  return typeof port === 'number' &&
    Number.isInteger(port) &&
    port >= 1 &&
    port <= highestPort
    ? port
    : undefined;
};

const portFlags =
  /(?:--port[ =]|(?:^|\s)-p[ =]?|(?:^|\s)PORT=)(?<port>\d{2,5})(?!\d)/u;

// The port a command says it listens on; a Storybook with none uses its own.
const portOf = (command: string): number | undefined =>
  portIn(portFlags.exec(command)?.groups?.['port']) ??
  (/\bstorybook dev\b/u.test(command) ? storybookPort : undefined);

const portFlagLiteral = /(?<flag>--port[ =]|(?:^|\s)-p[ =]?)\d{2,5}(?!\d)/u;

const portAssignment = /(?:^|\s)PORT=\d{2,5}(?!\d)(?:\s+|$)/u;

// A command Argo writes itself takes the Checkout's `$PORT` in place of a fixed one, so two worktrees can run it at once.
const withCheckoutPort = (command: string): string =>
  portIn(portFlags.exec(command)?.groups?.['port']) === undefined
    ? command
    : command
        .replace(portAssignment, (assignment) =>
          /^\s/u.test(assignment) ? ' ' : '',
        )
        .replace(portFlagLiteral, '$<flag>$$PORT')
        .trim();

// A drafted command, with the port it still has to pin when it cannot take `$PORT`.
const portedCommand = (command: string): Pick<Draft, 'command' | 'port'> => {
  const ported = withCheckoutPort(command);
  const port = ported === command ? portOf(command) : undefined;

  return { command: ported, ...(port && { port }) };
};

const plainWord = /^[\w@%+=:,./-]+$/u;

const quote = (word: string): string =>
  plainWord.test(word)
    ? word
    : ["'", word.replaceAll("'", String.raw`'\''`), "'"].join('');

const packageManagers = [
  ['pnpm-lock.yaml', 'pnpm'],
  ['yarn.lock', 'yarn'],
  ['bun.lock', 'bun'],
  ['bun.lockb', 'bun'],
] as const;

const packageManagerOf = async (checkout: string): Promise<string> => {
  for (const [lockfile, manager] of packageManagers)
    if (await exists(join(checkout, lockfile))) return manager;

  return 'npm';
};

const devScript = /^(?:dev|start|serve|preview|storybook|watch)(?::|$)/u;

const PackageJson = z.object({ scripts: z.record(z.string(), z.string()) });

export async function draftPackageScripts(
  checkout: string,
): Promise<SourceDrafts> {
  const source = 'package.json';

  const parsed = await readJson(checkout, source, PackageJson);

  const manager = await packageManagerOf(checkout);

  const drafts = parsed
    ? Object.entries(parsed.scripts)
        .filter(([name]) => devScript.test(name))
        .map(([name, script]): Draft => {
          const port = portOf(script);

          return {
            name,
            command: `${manager} run ${quote(name)}`,
            ...(port && { port }),
          };
        })
    : [];

  return { source, drafts, skipped: [] };
}

export async function draftProcfile(checkout: string): Promise<SourceDrafts> {
  const text = (await readIfPresent(checkout, 'Procfile')) ?? '';

  const drafts = text.split('\n').flatMap((line): Draft[] => {
    const match = /^(?<name>[\w-]+):\s*(?<command>\S.*)$/u.exec(line.trim());

    const { name, command } = match?.groups ?? {};

    if (!name || !command) return [];

    return [{ name, ...portedCommand(command) }];
  });

  return { source: 'Procfile', drafts, skipped: [] };
}

const LaunchConfiguration = z.object({
  name: z.string().min(1),
  request: z.string().optional(),
  command: z.string().optional(),
  runtimeExecutable: z.string().optional(),
  runtimeArgs: z.array(z.string()).optional(),
  program: z.string().optional(),
  args: z.array(z.string()).optional(),
  cwd: z.string().optional(),
  env: z.record(z.string(), z.unknown()).optional(),
  port: z.number().optional(),
  serverReadyAction: z.object({ pattern: z.string().optional() }).optional(),
});

type LaunchConfiguration = z.infer<typeof LaunchConfiguration>;

const LaunchFile = z.object({ configurations: z.array(z.unknown()) });

const editorVariable = /\$\{(?!workspace(?:Folder|Root)\})[^}]*\}/u;

// The Checkout is the folder an editor calls the workspace.
const inCheckout = (value: string): string =>
  value
    .replaceAll(/\$\{workspace(?:Folder|Root)\}\/?/gu, '')
    .replace(/^$/u, '.');

type Launch = { draft: Draft } | { reason: string };

const commandWords = (launch: LaunchConfiguration): string[] =>
  launch.command
    ? [launch.command]
    : [
        ...(launch.runtimeExecutable || !launch.program
          ? [launch.runtimeExecutable ?? '']
          : ['node']),
        ...(launch.runtimeArgs ?? []),
        ...(launch.program ? [launch.program] : []),
        ...(launch.args ?? []),
      ].filter(Boolean);

const envOf = (launch: LaunchConfiguration): Record<string, string> =>
  Object.fromEntries(
    Object.entries(launch.env ?? {}).map(([key, value]) => [
      key,
      String(value),
    ]),
  );

// Why a launch configuration cannot become a Run Configuration, if it cannot.
function refusalOf(
  launch: LaunchConfiguration,
  words: string[],
  env: Record<string, string>,
): string | undefined {
  if (launch.request === 'attach')
    return 'it attaches to a process instead of starting one';

  if (words.length === 0) return 'it has no program or command to run';

  const variable = [...words, launch.cwd ?? '', ...Object.values(env)]
    .map((value) => editorVariable.exec(value)?.[0])
    .find(Boolean);

  return variable && `it uses ${variable}, which only an editor can fill in`;
}

function workspaceExpander(
  checkout: string,
  cwd: string,
): (value: string) => string {
  const workspaceFromCwd = relative(resolve(checkout, cwd), checkout) || '.';

  return (value) =>
    value.replaceAll(
      /\$\{workspace(?:Folder|Root)\}/gu,
      () => workspaceFromCwd,
    );
}

// A port the launch names itself stays pinned; one only written in its command becomes `$PORT`.
function launchCommand(
  launch: LaunchConfiguration,
  env: Record<string, string>,
  written: string,
): Pick<Draft, 'command' | 'port'> {
  const pinned = portIn(launch.port) ?? portIn(env['PORT']);

  return pinned ? { command: written, port: pinned } : portedCommand(written);
}

function launchOf(checkout: string, launch: LaunchConfiguration): Launch {
  const words = commandWords(launch);

  const env = envOf(launch);

  const reason = refusalOf(launch, words, env);

  if (reason) return { reason };

  const cwd = launch.cwd ? inCheckout(launch.cwd) : '.';

  const expandWorkspace = workspaceExpander(checkout, cwd);

  const written = launch.command
    ? expandWorkspace(launch.command)
    : words.map((word) => quote(expandWorkspace(word))).join(' ');

  const { command, port } = launchCommand(launch, env, written);

  const pattern = launch.serverReadyAction?.pattern;

  return {
    draft: {
      name: launch.name,
      command,
      ...(cwd !== '.' && { cwd }),
      ...(Object.keys(env).length > 0 && {
        env: Object.fromEntries(
          Object.entries(env).map(([key, value]) => [
            key,
            expandWorkspace(value),
          ]),
        ),
      }),
      ...(port && { port }),
      ...(pattern && validReadyPattern(pattern) && { ready: { pattern } }),
    },
  };
}

// VS Code and Claude Code keep launch files of the same shape.
export async function draftLaunchFile(
  checkout: string,
  source: string,
): Promise<SourceDrafts> {
  const file = await readJson(checkout, source, LaunchFile);

  const result: SourceDrafts = { source, drafts: [], skipped: [] };

  for (const entry of file?.configurations ?? []) {
    const launch = LaunchConfiguration.safeParse(entry);

    if (!launch.success) continue;

    const drafted = launchOf(checkout, launch.data);

    if ('draft' in drafted) result.drafts.push(drafted.draft);
    else
      result.skipped.push({
        source,
        name: launch.data.name,
        reason: drafted.reason,
      });
  }

  return result;
}
