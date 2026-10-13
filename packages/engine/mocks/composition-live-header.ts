import type { SessionUpdate, FeedSubscribeOutput } from '@repo/contracts';
import { expect, onTestFinished } from 'vitest';
import {
  publishStoredHeaderRow,
  notifyHeaderChange,
} from './composition-header-rows';
import { nextMatching } from './composition-subscriptions';
import { openTestDatabase } from './database';
import { startEngineTestHost } from './engine';
import { scriptedEngineInput } from './scripted-engine';

type EngineHost = Awaited<ReturnType<typeof startEngineTestHost>>;
export type HeaderHost = EngineHost & {
  completed: PromiseWithResolvers<void>;
  input: ReturnType<typeof scriptedEngineInput>;
  controller: AbortController;
  subscription: AsyncIterator<FeedSubscribeOutput>;
};

export async function startHeaderHost(agent: string): Promise<HeaderHost> {
  const { database, remove } = openTestDatabase({ agent });
  onTestFinished(remove);
  const completed = Promise.withResolvers<void>();
  const input = headerInput(agent, completed.promise);
  const host = await startEngineTestHost({ database, ...input });
  return { ...host, ...(await openHeaderSubscription(host)), completed, input };
}

async function openHeaderSubscription(
  host: EngineHost,
): Promise<Pick<HeaderHost, 'caller' | 'controller' | 'subscription'>> {
  const controller = new AbortController();
  onTestFinished((): void => controller.abort());
  const caller = host.createCaller({ signal: controller.signal });
  await caller.session.prompt({
    sessionId: 'session-1',
    prompt: [{ type: 'text', text: 'Check tests' }],
  });
  const subscription = (
    await caller.feed.subscribe({ sessionId: 'session-1', after: null })
  )[Symbol.asyncIterator]();
  return { caller, controller, subscription };
}

function headerInput(
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

function hasActivity(event: FeedSubscribeOutput, text: string): boolean {
  if (event.type !== 'snapshot') return false;
  return event.snapshot.liveHeader?.text === text;
}

export async function expectHeaderActivity(
  host: HeaderHost,
  text: string,
): Promise<void> {
  await expect
    .poll(
      async () =>
        (await host.caller.session.list({ archived: false })).sessions[0]
          ?.activity,
    )
    .toBe(text);
  await nextMatching(host.subscription, (event) => hasActivity(event, text));
}

async function storedRevision(
  host: HeaderHost,
  id: string,
): Promise<number | undefined> {
  const page = await host.caller.feed.page({
    sessionId: 'session-1',
    direction: 'tail',
  });
  return page.rows.find((row) => row.id === id)?.revision;
}

export async function sendHeaderRow(
  host: HeaderHost,
  row: SessionUpdate,
): Promise<void> {
  const revision = await publishStoredHeaderRow(host, row);
  await expect.poll(() => storedRevision(host, row.id)).toBe(revision);
  await notifyHeaderChange(host.input, revision);
}
