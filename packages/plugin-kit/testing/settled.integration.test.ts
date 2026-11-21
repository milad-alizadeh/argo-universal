import { describe, expect, it } from 'vitest';
import { dataFixture } from '../mocks/data-fixture';
import type { PluginTest } from './test-types';

const slotId = 'argo/session/row/v1';

const contexts = [{ sessionId: 'first', projectId: 'one' }];

const sessions = {
  first: { projectId: 'one', branch: 'issue-412', title: 'First Session' },
};

const bump = {
  name: 'bump',
  label: 'Bump',
  description: 'Counts up and says it changed.',
  tier: 'act' as const,
  policy: 'allow' as const,
  params: {},
  caller: [],
};

// A Slot that shows a count; the Operation bumps it and says so with `argo.changed()`.
const source = `let count = 0;
  export function register(argo) {
    argo.operations.register('bump', () => { count += 1; argo.changed(); return null; });
    argo.slots.register('${slotId}', () => ({ first: [{ text: 'count ' + count }] }));
  }`;

type Answer =
  ReturnType<PluginTest['slotItems']> extends AsyncGenerator<infer Item>
    ? Item
    : never;

type Item = NonNullable<Answer[string]>['items'][number]['item'];

const itemOf = (answer: Answer | undefined): Item | undefined =>
  answer?.['first']?.items[0]?.item;

// Every answer the Slot gives, kept in order as they come.
function collected(kit: PluginTest, signal: AbortSignal): Answer[] {
  const answers: Answer[] = [];

  void (async (): Promise<void> => {
    for await (const answer of kit.slotItems({ slotId, contexts }, { signal }))
      answers.push(answer);
  })().catch(() => {});

  return answers;
}

describe.each([
  ['a host with a test clock', { clockStart: 0 }],
  ['a host on the real clock', { clockStart: undefined }],
])('settled on %s', (_name, options) => {
  it('waits out the change window, and the Slot answers with the change', async () => {
    const fixture = await dataFixture(
      source,
      { slots: [slotId], operations: [bump] },
      [{ kind: 'sessions:read' }],
    );

    const kit = await fixture.start({ sessions, ...options });
    const controller = new AbortController();
    const answers = collected(kit, controller.signal);

    await expect
      .poll(() => itemOf(answers.at(-1)), { timeout: 10_000 })
      .toEqual({ text: 'count 0' });

    await kit.operations.run({ name: 'bump', params: {} });
    await kit.settled();

    /*
     * On a test clock the Plugin calls the change set off are waited for too, so the answer is already there. On the
     * real clock only the window is waited for, and the Slot's read behind it lands a moment later.
     */
    await expect
      .poll(() => itemOf(answers.at(-1)), { timeout: 10_000 })
      .toEqual({ text: 'count 1' });
    controller.abort();
  });
});
