import type { PluginTest } from '@argo/plugin-kit/testing';
import { onTestFinished } from 'vitest';
import {
  caller,
  changesSlot,
  project,
  rowSlot,
  sessionId,
  type Caller,
  type Journey,
} from './journey-fixture';

// What an Agent's `argo run github.attach` does for the calling Session.
export async function attach(
  { test }: Journey,
  reference: string,
  as: Caller = caller,
): Promise<void> {
  await test.operations.run({
    name: 'attach',
    params: { reference },
    caller: as,
  });
}

type Identified = { id: string };

const hasId = (item: { id?: unknown }): item is Identified =>
  typeof item.id === 'string';

// The identities of the Changes Argo would draw for one Session, in order.
export async function idsOf(
  run: Journey,
  session: Caller = caller,
): Promise<string[]> {
  const changes = await changesOf(run, session);

  return changes.flatMap((item) => (hasId(item) ? [item.id] : []));
}

type OperationAnswer = Awaited<ReturnType<PluginTest['operations']['run']>>;

// What an Agent's `argo run github.detach` does for the calling Session.
export async function detach(
  { test }: Journey,
  reference: string,
  as: Caller = caller,
): Promise<OperationAnswer> {
  return test.operations.run({
    name: 'detach',
    params: { reference },
    caller: as,
  });
}

type SlotId = typeof changesSlot | typeof rowSlot;

type Answer =
  ReturnType<PluginTest['slotItems']> extends AsyncGenerator<infer Item>
    ? Item
    : never;

async function firstAnswer(
  { test }: Journey,
  session: Caller,
  slotId: SlotId,
): Promise<Answer | undefined> {
  const controller = new AbortController();

  onTestFinished(() => controller.abort());

  const answers = test.slotItems(
    { slotId, contexts: [session] },
    { signal: controller.signal },
  );

  return (await answers.next()).value;
}

type Attributed = { pluginId: string; item: object };

async function attributedOf(
  run: Journey,
  session: Caller,
  slotId: SlotId,
): Promise<Attributed[]> {
  const answer = await firstAnswer(run, session, slotId);

  return Object.values(answer ?? {}).flatMap(({ items }) =>
    items.map(({ pluginId, item }) => ({ pluginId, item })),
  );
}

// What the Changes Slot answers for one Session: each Change with the Plugin that sent it, in Slot order.
export const attributedChangesOf = (
  run: Journey,
  session: Caller = caller,
): Promise<Attributed[]> => attributedOf(run, session, changesSlot);

// What the Session row's Slot answers for one Session: each item with the Plugin that sent it, in Slot order.
export const attributedRowItemsOf = (
  run: Journey,
  session: Caller = caller,
): Promise<Attributed[]> => attributedOf(run, session, rowSlot);

// The Changes Argo would draw for one Session.
export async function changesOf(
  run: Journey,
  session: Caller = caller,
): Promise<object[]> {
  return (await attributedChangesOf(run, session)).map(({ item }) => item);
}

// What an Agent reads with `argo run github.list`: each PR as GitHub reports it, or with why it could not be read.
export async function listed(
  { test }: Journey,
  as: Caller = caller,
): Promise<OperationAnswer> {
  return test.operations.run({ name: 'list', caller: as });
}

// What an Agent's `argo run github.discover` does for the calling Session.
export async function discover(
  { test }: Journey,
  as: Caller = caller,
): Promise<OperationAnswer> {
  return test.operations.run({ name: 'discover', caller: as });
}

// Each Project picks its own Account; this gives another Project the one that is signed in.
export async function giveAccountTo(
  { test }: Journey,
  projectId: string,
): Promise<void> {
  const [account] = test.accounts.list();

  if (!account) throw new Error('Nobody is signed in');

  await test.accounts.choose({
    projectId,
    host: 'api.github.com',
    account: account.id,
  });
}

// The Engine now reports this Session on another branch, or on none.
export function switchBranch(
  { sessions }: Journey,
  branch: string | null,
): void {
  sessions[sessionId] = { projectId: project.id, title: 'Work', branch };
}

const itemsOfAnswer = (answer: Answer, session: Caller): object[] =>
  (answer[session.sessionId]?.items ?? []).map(({ item }) => item);

// The Changes Argo would redraw one Session with, each time the Plugin says they changed.
export async function* watchChanges(
  { test }: Journey,
  session: Caller = caller,
): AsyncGenerator<object[]> {
  const controller = new AbortController();

  onTestFinished(() => controller.abort());

  const answers = test.slotItems(
    { slotId: changesSlot, contexts: [session] },
    { signal: controller.signal },
  );

  for await (const answer of answers) yield itemsOfAnswer(answer, session);
}

async function nextRedraw(
  redraws: AsyncGenerator<object[]>,
): Promise<object[]> {
  const { value, done } = await redraws.next();

  if (done) throw new Error('The Slot ended before it showed the Changes.');

  return value;
}

// Each redraw until one has this many Changes; the watch stays open for the next call.
export async function untilChanges(
  redraws: AsyncGenerator<object[]>,
  count: number,
): Promise<object[]> {
  for (;;) {
    const changes = await nextRedraw(redraws);

    if (changes.length >= count) return changes;
  }
}
