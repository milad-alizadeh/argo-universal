// Many updates in a burst share one refetch in flight and one trailing refetch,
// so the list ends up current without a request per update.
export function createCoalescedRefetch(
  refetch: () => Promise<void>,
): () => void {
  let inFlight = false;
  let trailing = false;
  async function run(): Promise<void> {
    inFlight = true;
    try {
      do {
        trailing = false;
        await refetch();
      } while (trailing);
    } finally {
      inFlight = false;
    }
  }
  return () => {
    if (inFlight) {
      trailing = true;
      return;
    }
    void run();
  };
}
