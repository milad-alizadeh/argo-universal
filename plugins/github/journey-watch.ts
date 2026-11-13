import type { PluginTest } from '@argo/plugin-kit/testing';
import { onTestFinished } from 'vitest';
import { headFrom, pullOf, type FixturePull } from './github-fixture';
import { attach } from './journey-calls';
import {
  caller,
  changesSlot,
  journey,
  type Caller,
  type Journey,
} from './journey-fixture';

type Answer =
  ReturnType<PluginTest['slotItems']> extends AsyncGenerator<infer Item>
    ? Item
    : never;

export type OpenChanges = {
  // The Changes Argo draws next: the first answer, then each one that differs from the last.
  next: () => Promise<object[]>;
  // The App leaves the Changes content.
  close: () => void;
};

const changesIn = (answer: Answer | undefined): object[] =>
  Object.values(answer ?? {}).flatMap(({ items }) =>
    items.map(({ item }) => item),
  );

// A list an App keeps open while a Session's Changes are visible, as the Workbench or the Inspector does.
export function openChanges(
  { test }: Journey,
  session: Caller = caller,
): OpenChanges {
  const controller = new AbortController();

  const answers = test.slotItems(
    { slotId: changesSlot, contexts: [session] },
    { signal: controller.signal },
  );

  onTestFinished(() => controller.abort());

  return {
    next: async () => changesIn((await answers.next()).value),
    close: () => controller.abort(),
  };
}

// Argo's Changes clock, in milliseconds.
const refreshMs = 30_000;

// The Changes clock ticks once.
export async function tick({ test }: Journey): Promise<void> {
  await test.clock.advance(refreshMs);
}

// What `argo run github.refresh` answers: the retry.
export async function refreshed(
  { test }: Journey,
  as: Caller = caller,
): ReturnType<PluginTest['operations']['run']> {
  return test.operations.run({ name: 'refresh', caller: as });
}

export const repository = 'owner/repository';

// A head commit a push moves a pull request to.
export const newHead = 'fedcba9876543210fedcba9876543210fedcba98';

// The head of a pull request after a push moved it to `newHead`.
export const pushed = (number: number): FixturePull['head'] => ({
  ...headFrom('owner', `feature-${number}`),
  sha: newHead,
});

// The id the Plugin gives the Change of a pull request of the Project's repository.
export const idOf = (number: number): string =>
  `github:${repository}#${number}`;

// GitHub changes its mind about one pull request.
export function changePull(
  { github }: Journey,
  number: number,
  changes: Partial<FixturePull>,
): void {
  const [key, pull] = pullOf(repository, number, changes);

  github.pulls.set(key, pull);
}

// A signed-in Session with these pull requests attached, in this order.
export async function attached(...numbers: number[]): Promise<Journey> {
  const run = await journey();

  for (const number of numbers) {
    changePull(run, number, {});
    await attach(run, `#${number}`);
  }

  return run;
}
