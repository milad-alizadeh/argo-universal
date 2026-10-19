const testLimitMs = 10_000;

export async function withinPluginTestBudget(
  work: Promise<void>,
): Promise<void> {
  const timeout = Promise.withResolvers<never>();

  const timer = setTimeout(
    () => timeout.reject(new Error('Plugin test exceeded 10 seconds')),
    testLimitMs,
  );

  try {
    await Promise.race([work, timeout.promise]);
  } finally {
    clearTimeout(timer);
  }
}
