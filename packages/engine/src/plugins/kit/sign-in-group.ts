type Current = { id: string; key: string };

type GroupState = { current?: Current };

type Queue = <T>(id: string, work: () => Promise<T>) => Promise<T>;

function workQueue(): Queue {
  const pending = new Map<string, Promise<unknown>>();

  return (id, work) => {
    const next = (pending.get(id) ?? Promise.resolve())
      .catch(() => {})
      .then(work);

    pending.set(id, next);

    return next.finally(() => {
      if (pending.get(id) === next) pending.delete(id);
    });
  };
}

type SignInGroup = {
  run: Queue;
  keep: (id: string, key: string, write: () => Promise<void>) => Promise<void>;
  state: GroupState;
};

export function signInGroup(): SignInGroup {
  const run = workQueue();
  const state: GroupState = {};

  return {
    state,
    run,
    keep: (id, key, write) =>
      run(id, async () => {
        await write();
        state.current = { id, key };
      }),
  };
}
