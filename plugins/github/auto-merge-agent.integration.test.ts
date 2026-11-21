import { expect, it } from 'vitest';
import { attach } from './journey-calls-fixture';
import { caller, journey, project, sessionId } from './journey-fixture';

const slow = 30_000;

const reference = 'owner/repository#12';

const params = { reference, kind: 'merge', on: true };

it(
  'asks the person before an Agent turns on Auto-merge, and sends nothing to GitHub when they decline',
  async () => {
    const run = await journey();

    await attach(run, reference);

    await expect(
      run.test.operations.run({
        name: 'automationSet',
        params,
        caller,
        confirm: () => Promise.reject(new Error('The user declined')),
      }),
    ).rejects.toThrow('declined');
    await expect(
      run.test.operations.run({ name: 'automationSet', params, caller }),
    ).rejects.toThrow('active Turn');
    expect(run.github.autoMergeCalls()).toEqual([]);
  },
  slow,
);

it(
  'turns Auto-merge on for an Agent once the person confirms, and for a person at once',
  async () => {
    const run = await journey();
    const cards: unknown[] = [];

    await attach(run, reference);
    await run.test.operations.run({
      name: 'automationSet',
      params,
      caller,
      confirm: (card) => {
        cards.push(card);

        return Promise.resolve();
      },
    });

    expect(cards).toHaveLength(1);
    expect(run.github.autoMergeCalls().map(({ kind }) => kind)).toEqual([
      'enable',
    ]);

    await run.test.pages.run({
      operation: 'automationSet',
      sessionId,
      args: { ...params, on: false, projectId: project.id, sessionId },
    });

    expect(cards).toHaveLength(1);
    expect(run.github.autoMergeCalls().map(({ kind }) => kind)).toEqual([
      'enable',
      'disable',
    ]);
  },
  slow,
);
