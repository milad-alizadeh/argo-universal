import { existsSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import {
  block,
  changedFiles,
  checkChanged,
  format,
  lint,
  LINTED_FILE,
  parseJson,
  root,
} from './hook-checks.mts';

const PATCH_FILE_LINE = /^\*\*\* (?:Add File|Update File|Move to): (.+)$/;

// The next edit often adds the use, so after-edit leaves unused names to before-stop.
const UNUSED_RULES = new Set([
  'eslint(no-unused-vars)',
  'sonarjs(no-unused-vars)',
  'sonarjs(unused-import)',
]);

const hookInput = z.looseObject({
  cwd: z.string().optional(),
  stop_hook_active: z.boolean().optional(),
  tool_input: z
    .looseObject({
      file_path: z.string().optional(),
      command: z.union([z.string(), z.array(z.string())]).optional(),
    })
    .default({}),
});

type HookInput = z.infer<typeof hookInput>;

type PatchCommand = HookInput['tool_input']['command'];

function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];

  return new Promise<string>((resolve): void => {
    process.stdin.on('data', (chunk: Buffer): number => chunks.push(chunk));
    process.stdin.on('end', (): void =>
      resolve(Buffer.concat(chunks).toString('utf8')),
    );
  });
}

const commandText = (command: PatchCommand): string =>
  Array.isArray(command) ? command.join('\n') : (command ?? '');

const patchedPath = (line: string): string[] =>
  PATCH_FILE_LINE.exec(line)?.slice(1) ?? [];

function editedPaths({ tool_input: toolInput }: HookInput): string[] {
  if (toolInput.file_path !== undefined) return [toolInput.file_path];
  const text = commandText(toolInput.command);

  return text.includes('*** Begin Patch')
    ? text.split('\n').flatMap(patchedPath)
    : [];
}

function isInsideRoot(absolute: string): boolean {
  const relative = path.relative(root, absolute);

  return !relative.startsWith('..') && !path.isAbsolute(relative);
}

function afterEdit(input: HookInput): number {
  const base = input.cwd ?? process.cwd();

  const files = editedPaths(input)
    .map((edited): string => path.resolve(base, edited))
    .filter((file): boolean => existsSync(file))
    .map((file): string => realpathSync(file))
    .filter(isInsideRoot)
    .filter((file): boolean => LINTED_FILE.test(file));

  if (files.length === 0) return 0;

  return block([lint({ files, typeAware: false, skipped: UNUSED_RULES })]);
}

function beforeStop(input: HookInput): number {
  const files = input.stop_hook_active === true ? [] : changedFiles('HEAD');

  if (files.length === 0) return 0;
  format(files);

  return block(checkChanged(files));
}

const COMMANDS = new Set(['after-edit', 'before-stop']);

const command = process.argv[2] ?? '';

if (!COMMANDS.has(command)) {
  process.stderr.write('usage: agent-hooks.mts after-edit|before-stop\n');
  process.exit(1);
}

const parsed = parseJson(hookInput, await readStdin());

if (!parsed.success) {
  process.stderr.write('agent-hooks: unrecognised hook input; skipped\n');
  process.exit(0);
}

process.exit(
  command === 'after-edit' ? afterEdit(parsed.data) : beforeStop(parsed.data),
);
