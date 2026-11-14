import { expect } from '../fixtures';
import type { SecondApp } from '../second-app';
import { requests } from './agent-requests';
import { sessionId } from './feed';
import { Then, When } from './fixtures';
import { textOf } from './queue-observations';

Then(
  'the second App reads Queued Prompts {string}',
  async ({ page, secondApp }, joined: string): Promise<void> => {
    await expect
      .poll(async () =>
        (await secondApp.promptQueue(sessionId(page))).items.map((row) =>
          textOf(row.prompt),
        ),
      )
      .toEqual(joined.split('|'));
  },
);

When(
  'the second App changes its first Queued Prompt to {string}',
  async ({ page, secondApp }, text: string): Promise<void> => {
    const {
      items: [row],
    } = await secondApp.promptQueue(sessionId(page));

    const target = editTarget(row);
    editedTargets.set(secondApp, target);

    await secondApp.changeQueue(sessionId(page), { action: 'hold', ...target });
    await secondApp.changeQueue(sessionId(page), {
      action: 'save',
      ...target,
      prompt: [{ type: 'text', text }],
    });
  },
);

const editedTargets = new WeakMap<SecondApp, EditTarget>();

type EditTarget = { id: string; revision: number; token: string };

function editTarget(
  row: { id: string; revision: number } | undefined,
): EditTarget {
  if (!row) throw new Error('Expected a Queued Prompt');

  return { id: row.id, revision: row.revision, token: 'second-app-edit' };
}

Then(
  'the second App cannot overwrite the Prompt that already started',
  async ({ page, secondApp }): Promise<void> => {
    const target = editedTargets.get(secondApp);

    if (!target) throw new Error('Expected a saved queue edit');
    await expect(
      secondApp.changeQueue(sessionId(page), {
        action: 'save',
        ...target,
        prompt: [{ type: 'text', text: 'Stale edit' }],
      }),
    ).rejects.toMatchObject({ data: { code: 'CONFLICT' } });
  },
);

const closedApps = new WeakMap<SecondApp, string>();

When(
  'I close the App while its queued work waits',
  async ({ page, secondApp }): Promise<void> => {
    closedApps.set(secondApp, sessionId(page));
    await page.goto('about:blank');
  },
);

Then(
  'the queued Turns finish while that App is closed',
  async ({ app, secondApp }): Promise<void> => {
    const id = closedApps.get(secondApp);

    if (!id) throw new Error('Expected the App to have closed');
    await expect.poll(() => secondApp.completedTurns(id)).toBe(2);
    expect(requests(app.requestLogPath, 'session/prompt')).toHaveLength(2);
    expect((await secondApp.promptQueue(id)).items).toEqual([]);
  },
);
