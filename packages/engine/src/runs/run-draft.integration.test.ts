import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import { expect, it, onTestFinished } from 'vitest';
import { readRunConfigurations } from './run-configurations';
import { draftRunConfigurations } from './run-draft';

type Files = Record<string, Json>;

// A Checkout holding only these files.
async function checkoutWith(files: Files): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'run-draft-'));
  onTestFinished(() => rm(directory, { recursive: true, force: true }));

  for (const [path, content] of Object.entries(files)) {
    await mkdir(dirname(join(directory, path)), { recursive: true });
    await writeFile(
      join(directory, path),
      typeof content === 'string' ? content : JSON.stringify(content),
    );
  }

  return directory;
}

const draft = async (
  files: Files,
  overwrite = false,
): ReturnType<typeof draftRunConfigurations> =>
  draftRunConfigurations(await checkoutWith(files), overwrite);

const written = async (checkout: string): Promise<string> =>
  readFile(join(checkout, '.argo/run.json'), 'utf8');

it('drafts a Run Configuration for each dev script in package.json, run with the Project’s package manager', async () => {
  const checkout = await checkoutWith({
    'pnpm-lock.yaml': '',
    [packageJson]: {
      scripts: {
        dev: 'vite --port 5173',
        build: 'tsc',
        'dev:server': 'PORT=4000 node server.js',
        storybook: 'storybook dev',
        test: 'vitest',
      },
    },
  });

  const result = await draftRunConfigurations(checkout, false);

  expect(result.configurations).toEqual([
    { name: 'dev', command: 'pnpm run dev', port: 5173 },
    { name: 'dev:server', command: 'pnpm run dev:server', port: 4000 },
    { name: 'storybook', command: 'pnpm run storybook', port: 6006 },
  ]);
});

it('quotes the script name as one argument', async () => {
  const result = await draft({
    [packageJson]: { scripts: { "dev:Bob's app": 'vite' } },
  });

  expect(result.configurations).toEqual([
    {
      name: "dev:Bob's app",
      command: String.raw`npm run 'dev:Bob'\''s app'`,
    },
  ]);
});

const npmRunDev = 'npm run dev';

const packageJson = 'package.json';

it.each([
  ['yarn.lock', 'yarn run dev'],
  ['bun.lock', 'bun run dev'],
  ['package-lock.json', npmRunDev],
  ['nothing.txt', npmRunDev],
])(
  'runs a script with the package manager its %s shows',
  async (file, command) => {
    const result = await draft({
      [file]: '',
      [packageJson]: { scripts: { dev: 'next dev' } },
    });

    expect(result.configurations).toMatchObject([{ command }]);
  },
);

it('drafts one Run Configuration per Procfile process', async () => {
  const result = await draft({
    Procfile:
      '# processes\nweb: bundle exec rails server -p 3000\n\nworker: bundle exec sidekiq\n',
  });

  expect(result.configurations).toEqual([
    { name: 'web', command: 'bundle exec rails server -p 3000', port: 3000 },
    { name: 'worker', command: 'bundle exec sidekiq' },
  ]);
});

it('drafts a launch file’s command, folder, environment, port and readiness, with ${workspaceFolder} as the Checkout', async () => {
  const result = await draft({
    '.vscode/launch.json': `{
      // JSONC: comments and trailing commas are fine
      "version": "0.2.0",
      "configurations": [
        {
          "name": "API",
          "type": "node",
          "request": "launch",
          "runtimeExecutable": "pnpm",
          "runtimeArgs": ["--filter", "api", "dev"],
          "cwd": "\${workspaceFolder}/apps/api",
          "env": { "LOG": "debug", "PORT": 8080 },
          "serverReadyAction": { "pattern": "listening on port (\\\\d+)", "action": "openExternally" },
        },
        {
          "name": "Script",
          "type": "node",
          "request": "launch",
          "program": "\${workspaceFolder}/scripts/serve.js",
          "args": ["--name", "my app"]
        },
        { "name": "Attach", "type": "node", "request": "attach", "port": 9229 }
      ]
    }`,
  });

  expect(result.configurations).toEqual([
    {
      name: 'API',
      command: 'pnpm --filter api dev',
      cwd: 'apps/api',
      env: { LOG: 'debug', PORT: '8080' },
      port: 8080,
      ready: { pattern: 'listening on port (\\d+)' },
    },
    {
      name: 'Script',
      command: "node ./scripts/serve.js --name 'my app'",
    },
  ]);
  expect(result.skipped).toEqual([
    {
      source: '.vscode/launch.json',
      name: 'Attach',
      reason: 'it attaches to a process instead of starting one',
    },
  ]);
});

it('keeps workspace paths relative to the Checkout when a launch runs in an app folder', async () => {
  const result = await draft({
    '.vscode/launch.json': {
      configurations: [
        {
          name: 'App',
          cwd: '${workspaceFolder}/apps/api',
          program: '${workspaceFolder}/scripts/serve.js',
          args: ['--config', '${workspaceRoot}/config/api.json'],
        },
      ],
    },
  });

  expect(result.configurations).toEqual([
    {
      name: 'App',
      command: 'node ../../scripts/serve.js --config ../../config/api.json',
      cwd: 'apps/api',
    },
  ]);
});

it('drafts Claude Code’s launch file, with its port', async () => {
  const result = await draft({
    '.claude/launch.json': {
      version: '0.0.1',
      configurations: [
        {
          name: 'storybook',
          runtimeExecutable: 'pnpm',
          runtimeArgs: ['dev:storybook'],
          port: 6006,
        },
      ],
    },
  });

  expect(result.configurations).toEqual([
    { name: 'storybook', command: 'pnpm dev:storybook', port: 6006 },
  ]);
});

it('skips a launch configuration that needs a variable only an editor can fill in, and says why', async () => {
  const files = {
    '.vscode/launch.json': {
      configurations: [
        { name: 'Current file', request: 'launch', program: '${file}' },
      ],
    },
  };

  await expect(draft(files)).rejects.toThrow(
    /Current file: it uses \$\{file\}, which only an editor can fill in/u,
  );

  const withScript = await draft({
    ...files,
    [packageJson]: { scripts: { dev: 'vite' } },
  });

  expect(withScript.skipped).toEqual([
    {
      source: '.vscode/launch.json',
      name: 'Current file',
      reason: 'it uses ${file}, which only an editor can fill in',
    },
  ]);
});

it('keeps both when two sources name a Run Configuration alike, and drops one that repeats the same command', async () => {
  const result = await draft({
    [packageJson]: { scripts: { dev: 'vite' } },
    Procfile: 'dev: node other.js\n',
    '.claude/launch.json': {
      configurations: [
        { name: 'dev', runtimeExecutable: 'npm', runtimeArgs: ['run', 'dev'] },
      ],
    },
  });

  expect(
    result.configurations.map(({ name, command }) => [name, command]),
  ).toEqual([
    ['dev', npmRunDev],
    ['dev-2', 'node other.js'],
  ]);
});

it('keeps launch configurations that share a command but differ in environment, readiness or port', async () => {
  const result = await draft({
    '.vscode/launch.json': {
      configurations: [
        { name: 'API', program: 'serve.js', env: { MODE: 'dev' }, port: 3000 },
        { name: 'API', program: 'serve.js', env: { MODE: 'test' }, port: 3000 },
        { name: 'API', program: 'serve.js', env: { MODE: 'test' }, port: 3001 },
        {
          name: 'API',
          program: 'serve.js',
          env: { MODE: 'test' },
          port: 3001,
          serverReadyAction: { pattern: 'Ready' },
        },
      ],
    },
  });

  expect(result.configurations).toEqual([
    { name: 'API', command: 'node serve.js', env: { MODE: 'dev' }, port: 3000 },
    {
      name: 'API-2',
      command: 'node serve.js',
      env: { MODE: 'test' },
      port: 3000,
    },
    {
      name: 'API-3',
      command: 'node serve.js',
      env: { MODE: 'test' },
      port: 3001,
    },
    {
      name: 'API-4',
      command: 'node serve.js',
      env: { MODE: 'test' },
      port: 3001,
      ready: { pattern: 'Ready' },
    },
  ]);
});

it('writes a file that reads back as the drafted Run Configurations', async () => {
  const checkout = await checkoutWith({
    [packageJson]: { scripts: { dev: 'vite --port 5173' } },
  });

  await draftRunConfigurations(checkout, false);

  const read = readRunConfigurations(await written(checkout));

  expect(read).toMatchObject({
    ok: true,
    configurations: [{ name: 'dev', command: npmRunDev, port: 5173 }],
  });
});

it('never overwrites an existing .argo/run.json unless asked', async () => {
  const checkout = await checkoutWith({
    '.argo/run.json': '{ "configurations": [] }',
    [packageJson]: { scripts: { dev: 'vite' } },
  });

  await expect(draftRunConfigurations(checkout, false)).rejects.toThrow(
    /already exists/u,
  );
  expect(await written(checkout)).toBe('{ "configurations": [] }');

  await draftRunConfigurations(checkout, true);
  expect(await written(checkout)).toContain('"dev"');
});

it('refuses to write through a linked .argo directory outside the Checkout', async () => {
  const checkout = await checkoutWith({
    [packageJson]: { scripts: { dev: 'vite' } },
  });
  const outside = await checkoutWith({});
  await symlink(outside, join(checkout, '.argo'), 'dir');

  await expect(draftRunConfigurations(checkout, false)).rejects.toThrow(
    /\.argo.*inside the Checkout/u,
  );
  await expect(readFile(join(outside, 'run.json'))).rejects.toThrow('ENOENT');
});

it('refuses to overwrite a linked run.json outside the Checkout', async () => {
  const checkout = await checkoutWith({
    [packageJson]: { scripts: { dev: 'vite' } },
  });
  const outside = await checkoutWith({ 'run.json': 'original' });
  const target = join(outside, 'run.json');
  await mkdir(join(checkout, '.argo'));
  await symlink(target, join(checkout, '.argo', 'run.json'));

  await expect(draftRunConfigurations(checkout, true)).rejects.toThrow(
    /run\.json.*symbolic link/u,
  );
  await expect(readFile(target, 'utf8')).resolves.toBe('original');
});

it('does not import a launch file from outside the Checkout', async () => {
  const checkout = await checkoutWith({
    [packageJson]: { scripts: { dev: 'vite' } },
  });
  const outside = await checkoutWith({
    'launch.json': {
      configurations: [{ name: 'Outside', program: 'serve.js' }],
    },
  });
  await mkdir(join(checkout, '.vscode'));
  await symlink(
    join(outside, 'launch.json'),
    join(checkout, '.vscode', 'launch.json'),
  );

  const result = await draftRunConfigurations(checkout, false);

  expect(result.configurations).toEqual([{ name: 'dev', command: npmRunDev }]);
});

it('refuses, and writes nothing, when no source has anything to run', async () => {
  const checkout = await checkoutWith({
    [packageJson]: { scripts: { build: 'tsc' } },
  });

  await expect(draftRunConfigurations(checkout, false)).rejects.toThrow(
    /package\.json scripts, a Procfile/u,
  );
  await expect(written(checkout)).rejects.toThrow('ENOENT');
});

it('says which file is broken instead of drafting around it', async () => {
  const checkout = await checkoutWith({ [packageJson]: '{ "scripts": ' });

  await expect(draftRunConfigurations(checkout, false)).rejects.toThrow(
    /package\.json/u,
  );
});
