import type { PluginCapability } from '@repo/contracts/plugins';
import { expect, it } from 'vitest';
import { registeredProject } from '#mocks/probe-plugin';
import { refusal, refusedLines, runProbe } from '#mocks/probe-run';
import { argoLimitBytes } from '../plugins/services/plugin-limits';

const exec = 'process:exec';

const declared = 'not a declared command';

const ghList = `['gh', 'issue', 'list']`;

it('runs a declared command by argv with no shell, in the data folder by default, capped in output and time', async () => {
  const project = await registeredProject();

  const { results, data } = await runProbe({
    calls: {
      plain: `argo.process.run(['echo', '$HOME; echo injected'])`,
      loud: `argo.process.run(['head', '-c', '2000000', '/dev/zero']).then((r) => ({ ...r, stdout: r.stdout.length }))`,
      slow: `argo.process.run(['sleep', '5'], { timeoutMs: 200 })`,
      missing: `argo.process.run(['argo-no-such-command'])`,
      here: `argo.process.run(['pwd'])`,
      inProject: `argo.process.run(['pwd'], { cwd: ${JSON.stringify(project)} })`,
    },
    capabilities: [
      { kind: exec, command: 'echo', args: ['**'] },
      { kind: exec, command: 'head', args: ['-c', '*', '/dev/zero'] },
      { kind: exec, command: 'sleep', args: ['*'] },
      { kind: exec, command: 'argo-no-such-command', args: [] },
      { kind: exec, command: 'pwd', args: [] },
    ],
  });

  expect(results).toMatchObject({
    plain: {
      value: {
        stdout: '$HOME; echo injected\n',
        exitCode: 0,
        truncated: false,
      },
    },
    loud: { value: { truncated: true, stdout: argoLimitBytes } },
    slow: { value: { timedOut: true } },
    missing: { error: expect.stringContaining('ENOENT') },
    here: { value: { stdout: `${data}\n` } },
    inProject: { value: { stdout: `${project}\n` } },
  });
});

it('gives a child only PATH, HOME, LANG, TMPDIR and declared variables', async () => {
  const { results } = await runProbe({
    calls: {
      env: `argo.process.run(['env'], { env: { GH_TOKEN: 'synthetic' } }).then((r) => r.stdout.trim().split('\\n').map((line) => line.split('=')[0]).sort())`,
    },
    capabilities: [{ kind: exec, command: 'env', args: [], env: ['GH_TOKEN'] }],
  });

  const expected = ['GH_TOKEN', 'HOME', 'LANG', 'PATH', 'TMPDIR'].filter(
    (name) => name === 'GH_TOKEN' || process.env[name] !== undefined,
  );

  expect(results).toEqual({ env: { value: expected } });
});

it.each([
  {
    name: 'an undeclared command',
    call: `argo.process.run(['ls'])`,
    reason: declared,
  },
  {
    name: 'arguments outside the patterns',
    call: `argo.process.run(['gh', 'issue', 'create'])`,
    reason: declared,
  },
  {
    name: 'a spawn of an undeclared command',
    call: `argo.process.spawn(['ls'])`,
    reason: declared,
  },
  {
    name: 'an option where * takes one argument',
    call: `argo.process.run(['gh', 'issue', 'view', '--web'])`,
    reason: declared,
  },
  {
    name: 'a working directory outside',
    call: `argo.process.run(${ghList}, { cwd: '/' })`,
    reason: 'outside',
  },
  {
    name: 'an undeclared variable',
    call: `argo.process.run(${ghList}, { env: { OTHER: '1' } })`,
    reason: 'not a declared variable',
  },
  ...[
    'LD_PRELOAD',
    'DYLD_INSERT_LIBRARIES',
    'NODE_OPTIONS',
    'GIT_CONFIG_COUNT',
    'BASH_ENV',
    'NPM_CONFIG_SCRIPT_SHELL',
    'LESSOPEN',
  ].map((name) => ({
    name,
    call: `argo.process.run(${ghList}, { env: { ${name}: '/tmp/x' } })`,
    reason: 'never allowed',
  })),
])('refuses $name and logs it once', async ({ call, reason }) => {
  const gh: PluginCapability = {
    kind: exec,
    command: 'gh',
    args: ['issue', 'list', '**'],
    env: ['GH_TOKEN'],
  };

  const { results, log } = await runProbe({
    calls: { refused: call },
    capabilities: [
      gh,
      { kind: exec, command: 'gh', args: ['issue', 'view', '*'] },
    ],
  });

  expect(results).toEqual({ refused: refusal(reason) });
  expect(refusedLines(log)).toEqual([
    expect.stringContaining('Plugin probe: refused argo.process.'),
  ]);
});

it('lets * take an option only after a declared --', async () => {
  const { results } = await runProbe({
    calls: {
      afterEnd: `argo.process.run(['echo', '--', '-n']).then((r) => r.stdout)`,
    },
    capabilities: [{ kind: exec, command: 'echo', args: ['--', '*'] }],
  });

  expect(results).toEqual({ afterEnd: { value: '-- -n\n' } });
});

it('grants nothing a manifest does not declare', async () => {
  const { results } = await runProbe({
    calls: {
      process: `argo.process.run(['echo', 'hi'])`,
      fetch: `argo.fetch('https://example.com/')`,
    },
  });

  expect(results).toEqual({
    process: refusal('echo hi is not a declared command'),
    fetch: refusal('example.com is not a declared host'),
  });
});
