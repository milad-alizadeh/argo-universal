import { expect, it } from 'vitest';
import { ResourceCleanupError } from '../../lib/resource-cleanup-error';
import { readinessOfFailure } from './readiness-failure';

it('a check with no known cause is Couldn’t check, never a startup failure', () => {
  expect(readinessOfFailure(new Error('database is locked'))).toEqual({
    status: 'couldnt-check',
    reason: 'Readiness could not be determined.',
  });
});

it('a check whose process would not exit is Can’t start', () => {
  const failure = new ResourceCleanupError(
    Promise.resolve(),
    new Error('kill failed'),
  );

  expect(readinessOfFailure(failure)).toEqual({
    status: 'cant-start',
    reason: 'The Agent did not exit after its readiness check.',
  });
});
