import { rmSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  type Checkout,
  createCheckout,
  reorderedSum,
} from './verify.mocks.mts';

const lowerBranch = 'lower';

const crookedFile = 'crooked.json';

const baseFlag = '--base';

let checkout: Checkout;

// A stacked PR: the lower PR leaves a file that fails the format check, which is not this branch's change.
beforeEach((): void => {
  checkout = createCheckout();
  const { git, write } = checkout;
  const branch = (name: string): void => git('switch', '-qc', name);

  branch(lowerBranch);
  write(crookedFile, '{"a":1}\n');
  git('add', '.');
  git('commit', '-qm', lowerBranch);
  branch('upper');
  write('sum.mjs', reorderedSum);
});

afterEach((): void => {
  rmSync(checkout.root, { recursive: true, force: true });
});

describe('pnpm verify base', (): void => {
  it('checks the lower PR too when measuring from main', (): void => {
    const result = checkout.verify();

    expect(result.status).toBe(1);
    expect(result.output).toContain('checking the change since main');
    expect(result.output).toContain(crookedFile);
  });

  it('checks only the change since the base passed with --base', (): void => {
    const result = checkout.verify([baseFlag, lowerBranch]);

    expect(result.status).toBe(0);
    expect(result.output).toContain(
      'checking the change since lower (the base you passed).',
    );
    expect(result.output).not.toContain(crookedFile);
    expect(result.output).toContain('1 passed');
  });

  it('reads --base after the -- that pnpm forwards', (): void => {
    const result = checkout.verify(['--', baseFlag, lowerBranch]);

    expect(result.status).toBe(0);
    expect(result.output).toContain('checking the change since lower');
  });

  it('checks only the change since VERIFY_BASE', (): void => {
    const result = checkout.verify([], { VERIFY_BASE: lowerBranch });

    expect(result.status).toBe(0);
    expect(result.output).toContain('checking the change since lower');
  });

  it('fails when the base passed does not exist', (): void => {
    const result = checkout.verify([baseFlag, 'missing']);

    expect(result.status).toBe(1);
    expect(result.output).toContain('no merge base with missing.');
  });
});
