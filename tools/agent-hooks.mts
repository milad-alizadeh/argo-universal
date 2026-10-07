import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const root = fileURLToPath(new URL('..', import.meta.url)).replace(
  /[\\/]$/,
  '',
);
const biome = path.join(root, 'node_modules/.bin/biome');
const turbo = path.join(root, 'node_modules/.bin/turbo');
const BLOCK_EXIT_CODE = 2;
const OUTPUT_LINE_LIMIT = 60;
const CHECKED_FILE = /\.(?:ts|tsx|mts|mjs|json|jsonc)$/;
const TYPESCRIPT_FILE = /\.(?:ts|tsx|mts)$/;
const PATCH_FILE_LINE = /^\*\*\* (?:Add File|Update File|Move to): (.+)$/;

const hookInput = z.looseObject({
  cwd: z.string().optional(),
  stop_hook_active: z.boolean().optional(),
  tool_input: z
    .looseObject({
      file_path: z.string().optional(),
      command: z.union([z.string(), z.array(z.string())]).optional(),
    })
    .optional(),
});
type HookInput = z.infer<typeof hookInput>;

function run(binary: string, args: string[]) {
  const result = spawnSync(binary, args, { cwd: root, encoding: 'utf8' });
  return {
    status: result.status ?? 1,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

function readStdin() {
  const chunks: Buffer[] = [];
  return new Promise<string>((resolve) => {
    process.stdin.on('data', (chunk: Buffer) => chunks.push(chunk));
    process.stdin.on('end', () =>
      resolve(Buffer.concat(chunks).toString('utf8')),
    );
  });
}

function parseInput(text: string): HookInput | undefined {
  try {
    const parsed = hookInput.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

function editedPaths(input: HookInput) {
  const toolInput = input.tool_input;
  if (typeof toolInput?.file_path === 'string') return [toolInput.file_path];
  const command = Array.isArray(toolInput?.command)
    ? toolInput.command.join('\n')
    : toolInput?.command;
  if (!command?.includes('*** Begin Patch')) return [];
  return command
    .split('\n')
    .flatMap((line) => PATCH_FILE_LINE.exec(line)?.[1] ?? []);
}

function afterEdit(input: HookInput) {
  const base = input.cwd ?? process.cwd();
  const paths = new Set<string>();
  for (const edited of editedPaths(input)) {
    const absolute = path.resolve(base, edited);
    const relative = path.relative(root, absolute);
    if (relative.startsWith('..') || path.isAbsolute(relative)) continue;
    if (existsSync(absolute)) paths.add(absolute);
  }
  if (paths.size === 0) return 0;
  const result = run(biome, [
    'check',
    '--error-on-warnings',
    '--no-errors-on-unmatched',
    '--files-ignore-unknown=true',
    '--formatter-enabled=false',
    '--skip=correctness/noUnusedImports',
    '--skip=correctness/noUnusedVariables',
    '--reporter=concise',
    ...paths,
  ]);
  if (result.status === 0) return 0;
  process.stderr.write(result.stderr);
  return BLOCK_EXIT_CODE;
}

function changedFiles() {
  const tracked = run('git', ['diff', '--name-only', 'HEAD']).stdout;
  const untracked = run('git', [
    'ls-files',
    '--others',
    '--exclude-standard',
  ]).stdout;
  const names = `${tracked}\n${untracked}`
    .split('\n')
    .filter((name) => CHECKED_FILE.test(name));
  return [...new Set(names)].filter((name) =>
    existsSync(path.join(root, name)),
  );
}

function beforeStop(input: HookInput) {
  if (input.stop_hook_active === true) return 0;
  const files = changedFiles();
  if (files.length === 0) return 0;
  const unmatched = ['--no-errors-on-unmatched', '--files-ignore-unknown=true'];
  run(biome, ['format', '--write', ...unmatched, ...files]);
  const checks = [
    run(biome, [
      'check',
      '--error-on-warnings',
      ...unmatched,
      '--reporter=concise',
      ...files,
    ]),
  ];
  if (files.some((name) => TYPESCRIPT_FILE.test(name))) {
    checks.push(
      run(turbo, [
        'run',
        'check-types',
        '--affected',
        '--output-logs=errors-only',
      ]),
    );
  }
  const failed = checks.filter((check) => check.status !== 0);
  if (failed.length === 0) return 0;
  const output = failed
    .map((check) => `${check.stdout}${check.stderr}`)
    .join('\n');
  process.stderr.write(
    `${output.split('\n').slice(0, OUTPUT_LINE_LIMIT).join('\n')}\n`,
  );
  return BLOCK_EXIT_CODE;
}

const command = process.argv[2];
if (command !== 'after-edit' && command !== 'before-stop') {
  process.stderr.write('usage: agent-hooks.mts after-edit|before-stop\n');
  process.exit(1);
}
const input = parseInput(await readStdin());
if (!input) {
  process.stderr.write('agent-hooks: unrecognised hook input; skipped\n');
  process.exit(0);
}
process.exit(command === 'after-edit' ? afterEdit(input) : beforeStop(input));
