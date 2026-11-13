import type { PluginTest } from '@argo/plugin-kit/testing';
import { onTestFinished } from 'vitest';
import {
  caller,
  changesSlot,
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

type Answer =
  ReturnType<PluginTest['slotItems']> extends AsyncGenerator<infer Item>
    ? Item
    : never;

async function firstAnswer(
  { test }: Journey,
  session: Caller,
): Promise<Answer | undefined> {
  const controller = new AbortController();

  onTestFinished(() => controller.abort());

  const answers = test.slotItems(
    { slotId: changesSlot, contexts: [session] },
    { signal: controller.signal },
  );

  return (await answers.next()).value;
}

type Attributed = { pluginId: string; item: object };

// What the Slot answers for one Session: each Change with the Plugin that sent it, in Slot order.
export async function attributedChangesOf(
  run: Journey,
  session: Caller = caller,
): Promise<Attributed[]> {
  const answer = await firstAnswer(run, session);

  return Object.values(answer ?? {}).flatMap(({ items }) =>
    items.map(({ pluginId, item }) => ({ pluginId, item })),
  );
}

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
