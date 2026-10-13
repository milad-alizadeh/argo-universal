import type { FeedSubscribeOutput, SessionUpdate } from '@repo/contracts';
import { expect, onTestFinished } from 'vitest';
import { insertEndedTurn, openTestDatabase } from './database';
import { startEngineTestHost } from './engine';
import { publishHeaderConfiguration } from './live-header-configuration';
import { writeStoredHeader, storedHeaderRevision } from './live-header-storage';
import { scriptedEngineInput } from './scripted-engine';

type EngineHost = Awaited<ReturnType<typeof startEngineTestHost>>;

export type LiveHeaderHost = {
  host: EngineHost;
  database: EngineHost['database'];
  input: ReturnType<typeof scriptedEngineInput>;
  caller: EngineHost['caller'];
  subscription: AsyncIterator<FeedSubscribeOutput, void>;
  completed: PromiseWithResolvers<void>;
};

function createHeaderInput(
  agent: string,
  completed: Promise<void>,
): ReturnType<typeof scriptedEngineInput> {
  const responses = {
    'session/prompt': [
      { waitFor: completed },
      { steps: [{ type: 'wait-for-cancel' as const }] },
    ],
  };

  return scriptedEngineInput({ steps: [], responses }, agent);
}

function openHeaderDatabase(agent: string): EngineHost['database'] {
  const { database, remove } = openTestDatabase({ agent });
  insertEndedTurn(database);
  onTestFinished(remove);

  return database;
}

function createHeaderCaller(host: EngineHost): EngineHost['caller'] {
  const controller = new AbortController();
  onTestFinished((): void => controller.abort());

  return host.createCaller({ signal: controller.signal });
}

export async function startLiveHeaderHost(
  agent = 'mock',
): Promise<LiveHeaderHost> {
  const database = openHeaderDatabase(agent);
  const completed = Promise.withResolvers<void>();
  const input = createHeaderInput(agent, completed.promise);
  const host = await startEngineTestHost({ database, ...input });
  const caller = createHeaderCaller(host);
  const connections = { database, host, input, caller, completed };

  return { ...connections, subscription: await promptHeaderSession(caller) };
}

async function promptHeaderSession(
  caller: EngineHost['caller'],
): Promise<LiveHeaderHost['subscription']> {
  await caller.session.prompt({
    sessionId: 'session-1',
    prompt: [{ type: 'text', text: 'Check tests' }],
  });

  return (await caller.feed.subscribe({ sessionId: 'session-1', after: null }))[
    Symbol.asyncIterator
  ]();
}

export async function readLiveHeader(
  context: LiveHeaderHost,
  text: string,
): Promise<string> {
  await expect.poll(() => currentActivity(context)).toBe(text);
  let actual;

  do {
    actual = await nextHeaderText(context.subscription);
  } while (actual !== text);

  return actual;
}

async function nextHeaderText(
  subscription: LiveHeaderHost['subscription'],
): Promise<string | undefined> {
  const event = await nextHeaderEvent(subscription);

  if (event.type !== 'snapshot') return undefined;

  return event.snapshot.liveHeader?.text;
}

export async function publishStoredHeader(
  context: LiveHeaderHost,
  row: SessionUpdate,
): Promise<void> {
  writeStoredHeader(context, row);
  await expect
    .poll(() => storedHeaderRevision(context, row.id))
    .toBe(row.revision);
  await publishHeaderConfiguration(
    context,
    row.revision % 2 === 0 ? 'small' : 'large',
  );
}

async function nextHeaderEvent(
  subscription: LiveHeaderHost['subscription'],
): Promise<FeedSubscribeOutput> {
  const next = await subscription.next();

  if (next.done) throw new Error('Feed subscription ended');

  return next.value;
}

async function currentActivity(
  context: LiveHeaderHost,
): Promise<string | undefined> {
  return (await context.caller.session.list({ archived: false })).sessions[0]
    ?.activity;
}
