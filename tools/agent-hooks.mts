// Read docs/agents/hooks.md before changing this script or the hook configs that run it.
import { existsSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import {
  block,
  checkTypes,
  format,
  lint,
  parseJson,
  type Result,
  root,
  run,
} from './hook-checks.mts';

const FORMATTED_FILE = /\.(?:[cm]?[jt]sx?|jsonc?|css|ya?ml)$/;
const LINTED_FILE = /\.[cm]?[jt]sx?$/;
const TYPESCRIPT_FILE = /\.[cm]?tsx?$/;
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

function changedFiles(): string[] {
  const tracked = run('git', ['diff', '--name-only', 'HEAD']).output;
  const untracked = run('git', ['ls-files', '--others', '--exclude-standard']);
  const names = `${tracked}\n${untracked.output}`
    .split('\n')
    .filter((name): boolean => FORMATTED_FILE.test(name));
  return [...new Set(names)].filter((name): boolean =>
    existsSync(path.join(root, name)),
  );
}

function checkChanged(files: string[]): Result[] {
  const linted = files.filter((name): boolean => LINTED_FILE.test(name));
  const lintRun = {
    files: linted,
    typeAware: true,
    skipped: new Set<string>(),
  };
  const lints = linted.length > 0 ? [lint(lintRun)] : [];
  const typed = files.some((name): boolean => TYPESCRIPT_FILE.test(name));
  return typed ? [...lints, checkTypes()] : lints;
}

function beforeStop(input: HookInput): number {
  const files = input.stop_hook_active === true ? [] : changedFiles();
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
const raw = parseJson(await readStdin());
const parsed = hookInput.safeParse(raw);
if (!parsed.success) {
  process.stderr.write('agent-hooks: unrecognised hook input; skipped\n');
  process.exit(0);
}
process.exit(
  command === 'after-edit' ? afterEdit(parsed.data) : beforeStop(parsed.data),
);
