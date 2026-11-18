import {
  address,
  harness,
  pluginId,
  type Harness,
} from '#mocks/plugin-data-harness';

export const rateLimited = 'rate limited';

export const elsewhere = { ...address, path: '/other' };

// How the read after the write goes wrong: the worker fails it, or it throws before the worker is asked.
type Failure = { throws?: boolean; limitedUntil?: number };

// A Query that answered once and was then written to.
async function answeredThenWritten(): Promise<Harness> {
  const github = harness();
  const first = github.read();

  await github.answer({ count: 1 });
  await first;
  github.data.written(pluginId);

  return github;
}

const failing = async (github: Harness, throws: boolean): Promise<void> => {
  if (!throws) await github.fail(rateLimited);
};

// A Query that answered once, was written to, and whose next read failed.
export async function failedAfterAnswer(
  failure: Failure = {},
): Promise<Harness> {
  const github = await answeredThenWritten();

  github.faults.broken = failure.throws === true;
  github.faults.limitedUntil = failure.limitedUntil;

  const failed = github.read({ holder: elsewhere });

  await failing(github, github.faults.broken);
  await failed;

  return github;
}
