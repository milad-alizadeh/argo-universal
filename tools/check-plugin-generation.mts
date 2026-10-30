import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { resolveExecutable } from '@repo/executables';

const contracts = '@repo/contracts';

const pnpm = resolveExecutable('pnpm');

const checkTypes = 'check-types';

const root = resolve(import.meta.dirname, '..');

const outputPath = 'packages/plugin-kit/src/components.gen.d.ts';

const output = join(root, outputPath);

const schema = join(root, 'packages/contracts/src/plugins/core-kit-props.ts');

const originalSchema = await readFile(schema, 'utf8');

const cache = await mkdtemp(join(tmpdir(), 'argo-plugin-generation-'));

const marker = 'The button label. Generation freshness probe.';

function run(args: string[]): string {
  return execFileSync(pnpm, args, {
    cwd: root,
    env: { ...process.env, TURBO_CACHE_DIR: cache, TURBO_CACHE: 'local:rw' },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function generate(): string {
  return run([
    'exec',
    'turbo',
    'run',
    'generate:plugin-kit',
    '--cache=local:rw',
    `--cache-dir=${cache}`,
    '--output-logs=full',
  ]);
}

function expectStale(): void {
  const result = spawnSync(pnpm, ['--filter', contracts, 'check:plugin-kit'], {
    cwd: root,
    encoding: 'utf8',
  });

  assert.equal(
    result.status,
    1,
    'The freshness check must reject missing or stale declarations',
  );
  assert.match(result.stderr, /missing or stale/);
}

try {
  await rm(output, { force: true });
  expectStale();
  generate();
  const baseline = await readFile(output, 'utf8');
  assert.match(baseline, /The button label\./);
  console.log('PASS: missing declarations regenerate without a docs build');

  run(['--filter', contracts, 'generate:plugin-kit']);
  assert.equal(await readFile(output, 'utf8'), baseline);
  console.log('PASS: repeat generation is byte-for-byte deterministic');

  await rm(output);
  assert.match(
    run([
      'exec',
      'turbo',
      'run',
      checkTypes,
      '--filter=@argo/plugin-kit',
      '--cache=local:rw',
      `--cache-dir=${cache}`,
      '--output-logs=full',
    ]),
    /cache hit/,
    'The declaration task must restore its cached output',
  );

  assert.equal(await readFile(output, 'utf8'), baseline);

  for (const consumer of ['@argo/plugin-kit', '@argo/issue-tracker']) {
    await rm(output);
    run(['--filter', consumer, checkTypes]);
    assert.equal(await readFile(output, 'utf8'), baseline);
  }

  console.log(
    'PASS: direct kit and Issue tracker type checks recover a missing declaration',
  );
  console.log(
    'PASS: cache restoration provides usable Plugin JSX types to the kit and Issue tracker',
  );

  assert.ok(originalSchema.includes("describe('The button label.')"));
  await writeFile(
    schema,
    originalSchema.replace(
      "describe('The button label.')",
      `describe('${marker}')`,
    ),
  );
  expectStale();
  assert.match(
    run(['--filter', '@argo/issue-tracker', checkTypes]),
    /(?:@repo\/contracts:generate:plugin-kit: |::group::@repo\/contracts:generate:plugin-kit\r?\n)cache miss, executing /,
    'A direct consumer must invalidate the declaration cache after a schema change',
  );
  assert.ok((await readFile(output, 'utf8')).includes(marker));
  run(['--filter', contracts, 'check:plugin-kit']);
  console.log(
    'PASS: direct consumer type checks regenerate stale schema descriptions and editor hover hints',
  );
} finally {
  await writeFile(schema, originalSchema);
  generate();
  await rm(cache, { recursive: true, force: true });
}

assert.equal(run(['exec', 'git', 'ls-files', '--', outputPath]), '');

run(['exec', 'git', 'check-ignore', outputPath]);

console.log('PASS: generated declarations are ignored and untracked');
