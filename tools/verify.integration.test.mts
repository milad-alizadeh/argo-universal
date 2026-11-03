import { readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  type Checkout,
  createCheckout,
  generatedProcedureFile,
  registryValidatorGenerator,
  reorderedSum,
} from './verify.mocks.mts';

let checkout: Checkout;

beforeEach((): void => {
  checkout = createCheckout();
});

afterEach((): void => {
  rmSync(checkout.root, { recursive: true, force: true });
});

describe('pnpm verify', (): void => {
  it('passes at once when nothing changed since main', (): void => {
    const result = checkout.verify();

    expect(result.status).toBe(0);
    expect(result.output).toContain('checking the change since main');
    expect(result.output).toContain('nothing changed since main');
  });

  it('runs the test that imports a changed file', (): void => {
    checkout.write('sum.mjs', reorderedSum);

    const result = checkout.verify();

    expect(result.status).toBe(0);
    expect(result.output).toContain('format, lint and types pass.');
    expect(result.output).toContain('running the 1 test files');
    expect(result.output).toContain('1 passed');
  });

  it('fails when a changed file is not formatted', (): void => {
    checkout.write('crooked.json', '{"a":1}\n');

    const result = checkout.verify();

    expect(result.status).toBe(1);
    expect(result.output).toContain('crooked.json');
  });

  it('fails when a dependent test fails', (): void => {
    checkout.write('sum.mjs', 'export const sum = (a, b) => a - b;\n');

    const result = checkout.verify();

    expect(result.status).toBe(1);
    expect(result.output).toContain('format, lint and types pass.');
    expect(result.output).toContain('1 failed');
  });

  it('fails when a new hand-written mutation is added', (): void => {
    checkout.write(
      'packages/engine/src/new-router.mjs',
      "import { initTRPC } from '@trpc/server';\n\nconst publicProcedure = initTRPC.create().procedure;\n\nexport const routes = {\n  erase: publicProcedure.mutation(() => null),\n};\n",
    );
    checkout.write('sum.mjs', reorderedSum);

    const result = checkout.verify();

    expect(result.status).toBe(1);
    expect(result.output).toContain(
      'Add an Operation instead of the hand-written mutation erase.',
    );
    expect(result.output).not.toContain('Operation procedures are stale.');
    expect(result.output).toContain('1 passed');
  });

  it('fails when generated Operation procedures are stale before another file changes', (): void => {
    const generated = readFileSync(
      path.join(checkout.root, generatedProcedureFile),
      'utf8',
    );

    checkout.write(generatedProcedureFile, `${generated}\n// Stale fixture.\n`);
    checkout.git('add', generatedProcedureFile);
    checkout.git('commit', '-q', '-m', 'stale generated procedure');
    checkout.write('sum.mjs', reorderedSum);

    const result = checkout.verify();

    expect(result.status).toBe(1);
    expect(result.output).toContain('Operation procedures are stale.');
    expect(result.output).not.toContain('Add an Operation instead');
    expect(result.output).toContain('1 passed');
  });

  it('fails when the Registry validators are stale', (): void => {
    rmSync(path.join(checkout.root, registryValidatorGenerator));
    checkout.write(
      registryValidatorGenerator,
      "if (process.argv.includes('--check')) throw new Error('Registry validators are stale.');\n",
    );
    checkout.write('sum.mjs', reorderedSum);

    const result = checkout.verify();

    expect(result.status).toBe(1);
    expect(result.output).toContain('Registry validators are stale.');
    expect(result.output).toContain('1 passed');
  });
});
