import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { RunOutput } from '@repo/contracts';
import { expect, it, onTestFinished } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { createFakeTerminals } from '#mocks/fake-terminals';
import type { TerminalProcess } from './terminal';

const name = 'web';

const web = { name, command: 'pnpm dev', ready: { pattern: 'Local:' } };

async function configure(checkout: string): Promise<void> {
  await mkdir(join(checkout, '.argo'), { recursive: true });
  await writeFile(
    join(checkout, '.argo', 'run.json'),
    JSON.stringify({ configurations: [web] }),
  );
}

type Fixture = {
  caller: Awaited<ReturnType<typeof startAcpEngine>>['caller'];
  terminals: ReturnType<typeof createFakeTerminals>;
  sessionId: string;
};

async function startProject(): Promise<Fixture> {
  const terminals = createFakeTerminals();

  const { caller } = await startAcpEngine({
    steps: [],
    terminalSpawner: terminals.spawn,
  });

  onTestFinished(terminals.end);
  const { sessionId } = await caller.session.new(emptySessionInput);
  const { checkout } = await caller.session.get({ sessionId });
  await configure(checkout.path);

  return { caller, terminals, sessionId };
}

it('updates both Sessions on a Checkout as its Run starts, becomes ready, and stops', async () => {
  const { caller, terminals, sessionId } = await startProject();
  const other = await caller.session.new(emptySessionInput);
  const events = await caller.run.watchStatus(other);
  const statuses = events[Symbol.asyncIterator]();
  onTestFinished(async () => {
    await statuses.return?.();
  });

  await expect(statuses.next()).resolves.toMatchObject({
    value: { configurations: [{ name, status: 'stopped', port: null }] },
  });

  const starting = caller.run.start({ sessionId, name });
  const terminal = await terminals.next();
  const port = terminal.launch.port;
  await expect(statuses.next()).resolves.toMatchObject({
    value: { configurations: [{ name, status: 'starting', port }] },
  });

  terminal.print('Local:\r\n');
  await expect(starting).resolves.toMatchObject({ ready: true, port });
  await expect(statuses.next()).resolves.toMatchObject({
    value: { configurations: [{ name, status: 'ready', port }] },
  });

  await caller.run.stop({ sessionId, name });
  await expect(statuses.next()).resolves.toMatchObject({
    value: { configurations: [{ name, status: 'stopped' }] },
  });
});

it('watches Run Configuration creation and recovers after an invalid edit', async () => {
  const { caller } = await startAcpEngine({ steps: [] });
  const session = await caller.session.new(emptySessionInput);
  const { checkout } = await caller.session.get(session);
  const events = await caller.run.watchStatus(session);
  const statuses = events[Symbol.asyncIterator]();

  await expect(statuses.next()).resolves.toMatchObject({
    value: { configurations: [] },
  });
  await configure(checkout.path);
  await expect(statuses.next()).resolves.toMatchObject({
    value: { configurations: [{ name, status: 'stopped' }] },
  });

  await writeFile(join(checkout.path, '.argo', 'run.json'), '{');
  await expect(statuses.next()).resolves.toMatchObject({
    value: { configurationError: expect.any(String) },
  });
  await configure(checkout.path);
  await expect(statuses.next()).resolves.toEqual({
    done: false,
    value: {
      configurations: [
        {
          name,
          command: web.command,
          status: 'stopped',
          port: null,
          url: null,
          exitCode: null,
          startedAt: null,
        },
      ],
    },
  });
  await statuses.return?.();
});

function watchOutput(
  events: AsyncIterable<RunOutput>,
): AsyncIterator<RunOutput> {
  const iterator = events[Symbol.asyncIterator]();
  onTestFinished(async () => {
    await iterator.return?.();
  });

  return iterator;
}

async function readFrame(events: AsyncIterator<RunOutput>): Promise<RunOutput> {
  const frame = await events.next();

  if (frame.done) throw new Error('The Terminal output stream closed.');

  return frame.value;
}

async function readBytes(events: AsyncIterator<RunOutput>): Promise<RunOutput> {
  let frame = await readFrame(events);

  while (!frame.data) frame = await readFrame(events);

  return frame;
}

const decoded = ({ data }: RunOutput): string =>
  Buffer.from(data, 'base64').toString('utf8');

async function finishStart(
  terminals: Fixture['terminals'],
  started: ReturnType<Fixture['caller']['run']['start']>,
  content: string,
): Promise<void> {
  const terminal = await terminals.next();
  terminal.print(content);
  await started;
}

it('replays recorded Terminal bytes, streams new bytes and resumes at a saved cursor', async () => {
  const { caller, terminals, sessionId } = await startProject();
  const target = { sessionId, name };
  const terminalText = 'Local:\r\n\u001b[31m🚀\u001b[0m';
  const started = caller.run.start(target);
  const terminal = await terminals.next();
  terminal.print(terminalText);
  await started;

  const output = watchOutput(await caller.run.output(target));

  const replay = await readBytes(output);
  expect(decoded(replay)).toBe(terminalText);
  expect(replay.cursor.offset).toBe(21);

  const live = readFrame(output);

  terminal.print('\r\nReloaded');
  const next = await live;
  expect(decoded(next)).toBe('\r\nReloaded');
  await output.return?.();

  terminal.print('\r\nWhile away');

  const reopened = watchOutput(
    await caller.run.output({ ...target, cursor: next.cursor }),
  );

  const missed = await readFrame(reopened);
  expect(decoded(missed)).toBe('\r\nWhile away');
  expect(missed.cursor.runId).toBe(next.cursor.runId);
});

it('starts the replacement Terminal at offset zero when a Run restarts', async () => {
  const { caller, terminals, sessionId } = await startProject();
  const target = { sessionId, name };
  await finishStart(terminals, caller.run.start(target), 'Local: first');
  const output = watchOutput(await caller.run.output(target));
  const first = await readBytes(output);

  const restarting = caller.run.restart(target);
  const replacement = await terminals.next();
  const reset = await readFrame(output);
  expect(reset.cursor.runId).not.toBe(first.cursor.runId);
  expect(reset.cursor.offset).toBe(0);
  expect(decoded(reset)).toBe('');

  replacement.print('Local: second');
  await restarting;

  const second = await readFrame(output);
  expect(second.cursor.runId).toBe(reset.cursor.runId);
  expect(decoded(second)).toBe('Local: second');
});

it('replays only Terminal output belonging to the selected Session’s Checkout', async () => {
  const { caller, terminals, sessionId } = await startProject();

  const other = await caller.session.new({
    ...emptySessionInput,
    checkout: { type: 'worktree', baseBranch: 'main' },
  });

  const { checkout } = await caller.session.get(other);
  await configure(checkout.path);
  await finishStart(
    terminals,
    caller.run.start({ sessionId, name }),
    'Local: main',
  );
  await finishStart(
    terminals,
    caller.run.start({ ...other, name }),
    'Local: worktree',
  );

  const output = watchOutput(await caller.run.output({ ...other, name }));

  const frame = await readBytes(output);
  expect(decoded(frame)).toBe('Local: worktree');
});

it('keeps UTF-8 bytes intact when a character crosses the replay frame boundary', async () => {
  const { caller, terminals, sessionId } = await startProject();
  const target = { sessionId, name };
  const prefix = `Local:${'x'.repeat(32_761)}`;
  const content = `${prefix}🚀`;
  await finishStart(terminals, caller.run.start(target), content);
  const output = watchOutput(await caller.run.output(target));
  const first = await readBytes(output);
  const chunks = [Buffer.from(first.data, 'base64')];
  const length = Buffer.byteLength(content);
  let offset = first.cursor.offset;

  while (offset < length) {
    const next = await readBytes(output);
    chunks.push(Buffer.from(next.data, 'base64'));
    offset = next.cursor.offset;
  }

  expect(first.cursor.offset).toBeLessThan(length);
  expect(Buffer.concat(chunks).toString('utf8')).toBe(content);
});

it('resizes the live PTY and the screen from the App Inspector', async () => {
  const { caller, terminals, sessionId } = await startProject();
  const started = caller.run.start({ sessionId, name });
  const terminal = await terminals.next();
  terminal.print('Local:\r\n');
  await started;

  const deviceTerminal: TerminalProcess = terminal;
  deviceTerminal.resize = (columns, rows): void =>
    terminal.print(
      `\u001b[2J\u001b[H${columns}x${rows}\r\n012345678901234567890123`,
    );

  await caller.terminal.resize({ sessionId, name, columns: 20, rows: 8 });

  await expect(
    caller.terminal.read({ sessionId, name }),
  ).resolves.toMatchObject({
    screen: '20x8\n01234567890123456789\n0123',
  });
});
