/*
 * Many updates in a burst share one refetch in flight and one trailing
 * refetch, so the list ends up current without a request per update.
 */
export function createCoalescedRefetch(
  refetch: () => Promise<void>,
): () => void {
  const state = { inFlight: false, trailing: false };
  return () => {
    if (state.inFlight) state.trailing = true;
    else void drain(state, refetch);
  };
}

async function drain(
  state: { inFlight: boolean; trailing: boolean },
  refetch: () => Promise<void>,
): Promise<void> {
  state.inFlight = true;
  try {
    do {
      state.trailing = false;
      await refetch();
    } while (state.trailing);
  } finally {
    state.inFlight = false;
  }
}
