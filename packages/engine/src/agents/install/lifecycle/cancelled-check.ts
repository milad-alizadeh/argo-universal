// A failed change leaves the Agent as it was, so the Readiness check it stopped runs again.
export const recheckIfFailed = async <Result>(
  cancelled: boolean | Promise<boolean>,
  change: () => Promise<Result>,
  recheck: () => void,
): Promise<Result> => {
  try {
    return await change();
  } catch (error) {
    if (await cancelled) recheck();

    throw error;
  }
};
