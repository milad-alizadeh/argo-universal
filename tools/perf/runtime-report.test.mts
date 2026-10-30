import { describe, expect, it } from 'vitest';
import type { RuntimeCase } from './runtime-options.mts';
import { runtimeCompleteness } from './runtime-report.mts';

const taken = (kind: RuntimeCase, count: number): RuntimeCase[] =>
  Array.from({ length: count }, () => kind);

describe('a runtime timing report accounting for the cases it was asked for', () => {
  it('reports a run that took every requested sample of every case as complete', () => {
    expect(
      runtimeCompleteness({ runs: 2, cases: ['command', 'delay'] }, [
        ...taken('command', 2),
        ...taken('delay', 2),
      ]),
    ).toMatchObject({ status: 'complete', missing: [] });
  });

  it('names a requested case that never produced a trial', () => {
    expect(
      runtimeCompleteness(
        { runs: 2, cases: ['command', 'cancel'] },
        taken('command', 2),
      ),
    ).toMatchObject({ status: 'partial', missing: ['cancel'] });
  });

  it('names a case the run abandoned part way through its samples', () => {
    expect(
      runtimeCompleteness(
        { runs: 10, cases: ['command'] },
        taken('command', 3),
      ),
    ).toMatchObject({ status: 'partial', missing: ['command'] });
  });
});
