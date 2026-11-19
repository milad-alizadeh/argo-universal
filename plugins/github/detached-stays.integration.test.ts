import { expect, it } from 'vitest';
import { attach, detach, discover, idsOf } from './journey-calls-fixture';
import { caller, journey, project, sessionId } from './journey-fixture';

const slow = 30_000;

const own = 'github:owner/repository#12';

const reference = 'owner/repository#12';

// What Argo's own `github.discover` does when a Turn ends: it looks only while the Session has no pull request.
const turnEnded = (
  run: Awaited<ReturnType<typeof journey>>,
): ReturnType<typeof discover> =>
  run.test.operations.run({
    name: 'discover',
    params: { unlessAttached: true },
    caller,
  });

it(
  'never attaches a detached pull request again when a Turn ends or an Agent discovers',
  async () => {
    const run = await journey();

    await discover(run);
    await detach(run, reference);

    expect(await turnEnded(run)).toEqual({
      result: 'detached',
      pullRequests: [{ repository: 'owner/repository', number: 12 }],
    });
    expect(await discover(run)).toMatchObject({ result: 'detached' });
    expect(await idsOf(run)).toEqual([]);
  },
  slow,
);

it(
  "refuses an Agent's attach of a detached pull request unless it asks again",
  async () => {
    const run = await journey();

    await attach(run, reference);
    await detach(run, reference);

    await expect(attach(run, reference)).rejects.toThrow(/detached/);
    expect(await idsOf(run)).toEqual([]);

    await run.test.operations.run({
      name: 'attach',
      params: { reference, again: true },
      caller,
    });
    expect(await idsOf(run)).toEqual([own]);
    // Attached again, it is the Session's like any other: discovery keeps it.
    expect(await discover(run)).toMatchObject({ result: 'found' });
  },
  slow,
);

it(
  'lets a person attach a pull request they detached, and discovery then keeps it',
  async () => {
    const run = await journey();

    await attach(run, reference);
    await detach(run, reference);

    await run.test.operations.run({
      name: 'attach',
      params: { reference, sessionId },
      caller: { projectId: project.id, person: true },
    });

    expect(await idsOf(run)).toEqual([own]);
  },
  slow,
);
