// A step that fails does not stop the next: a clipboard that refuses still opens the page, whose code is on screen to read.
export async function runSteps<Step>(
  steps: readonly Step[],
  run: (step: Step) => Promise<void>,
): Promise<void> {
  const failures: Error[] = [];

  for (const step of steps)
    await run(step).catch((cause: Error) => {
      failures.push(cause);
    });

  if (failures[0]) throw failures[0];
}
