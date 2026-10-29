import { expect, it } from 'vitest';
import { type GroupPort, releaseProcessGroup } from './index';

const group = 4242;

type RecordingPort = { port: GroupPort; killed: number[] };

// A group whose members stay live until killed, or forever.
function createPort(options: {
  survivesKill: boolean;
  startsEmpty?: boolean;
}): RecordingPort {
  const killed: number[] = [];

  const port: GroupPort = {
    kill: (target): void => void killed.push(target),
    hasLiveMember: (): boolean =>
      options.startsEmpty ? false : options.survivesKill || killed.length === 0,
  };

  return { port, killed };
}

it('a group that survives SIGKILL past the deadline is unresolved', async () => {
  const { port, killed } = createPort({ survivesKill: true });
  await expect(
    releaseProcessGroup(group, { deadlineMs: 60, port }),
  ).resolves.toBe('unresolved');
  expect(killed).toEqual([group]);
});

it('a group whose members stop after SIGKILL is released', async () => {
  const { port, killed } = createPort({ survivesKill: false });
  await expect(releaseProcessGroup(group, { port })).resolves.toBe('released');
  expect(killed).toEqual([group]);
});

it('a group with no live member is released without a signal', async () => {
  const { port, killed } = createPort({
    survivesKill: false,
    startsEmpty: true,
  });

  await expect(releaseProcessGroup(group, { port })).resolves.toBe('released');
  expect(killed).toEqual([]);
});

it('a failed signal leaves the group unresolved', async () => {
  const port: GroupPort = {
    kill: (): void => {
      throw new Error('signal failed');
    },
    hasLiveMember: (): boolean => true,
  };

  await expect(releaseProcessGroup(group, { port })).resolves.toBe(
    'unresolved',
  );
});
