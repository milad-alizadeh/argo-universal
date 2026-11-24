interface Throttled {
  call: () => void;
  cancel: () => void;
}

/*
 * Runs `run` at once, then at most once per `interval` while calls keep coming, and once more after the last call
 * so the state where the calls stopped is not lost.
 */
export function throttle(run: () => void, interval: number): Throttled {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending = false;

  const release = (): void => {
    timer = undefined;

    if (!pending) return;

    pending = false;
    run();
    timer = setTimeout(release, interval);
  };

  return {
    call: () => {
      if (timer !== undefined) {
        pending = true;

        return;
      }

      run();
      timer = setTimeout(release, interval);
    },
    cancel: () => {
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
      pending = false;
    },
  };
}
