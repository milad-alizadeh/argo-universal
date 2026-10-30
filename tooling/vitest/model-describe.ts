import { describe, expect, it } from 'vitest';
import type { Model } from './model-types';

// Runs every generated path of a model as its own test; call it inside the `describe` that names the model. The test file keeps the one `it` that expects the paths to walk every transition, as the repo's lint wants a test in every test file.
export function describeModel(model: Model): void {
  describe.each(model.suites)('$name', ({ cases }): void => {
    it.each(cases)('$title', async ({ run }): Promise<void> => {
      expect.hasAssertions();
      await run();
    });
  });
}
