import { describe, expect, it } from 'vitest';
import { completenessNotice, runCompleteness } from './run-completeness.mts';

const sidebar = 'sidebar at 1x CPU';

const drawer = 'drawer at 1x CPU';

const feed = 'feed at 1x CPU';

const paging = 'feed-page-ready at 1x CPU';

describe('a performance run accounting for the scenarios it planned', () => {
  it('reports a run that measured every scenario it planned as complete', () => {
    expect(
      runCompleteness([sidebar, drawer], { measured: [sidebar, drawer] }),
    ).toEqual({
      status: 'complete',
      planned: [sidebar, drawer],
      measured: [sidebar, drawer],
      notApplicable: [],
      missing: [],
    });
  });

  it('names the planned scenarios that produced no measurement', () => {
    expect(
      runCompleteness([sidebar, drawer, feed], { measured: [sidebar] }),
    ).toMatchObject({ status: 'partial', missing: [drawer, feed] });
  });

  it('accounts for a scenario the dataset cannot exercise rather than calling it missing', () => {
    expect(
      runCompleteness([paging], { measured: [], notApplicable: [paging] }),
    ).toMatchObject({ status: 'complete', missing: [] });
  });

  it('prints every unmeasured scenario when the run is partial', () => {
    const notice = completenessNotice(
      runCompleteness([sidebar, drawer], { measured: [sidebar] }),
    );

    expect(notice).toContain('INCOMPLETE RUN');
    expect(notice).toContain('1 of 2 scenarios produced no measurement');
    expect(notice).toContain(`Never measured: ${drawer}.`);
  });

  it('refuses to call a run that planned nothing complete', () => {
    expect(runCompleteness([], { measured: [] })).toMatchObject({
      status: 'partial',
    });
  });

  it('says a run that planned nothing measured nothing', () => {
    expect(completenessNotice(runCompleteness([], { measured: [] }))).toContain(
      'INCOMPLETE RUN: the run planned no scenarios at all',
    );
  });

  it('says a complete run is complete', () => {
    expect(
      completenessNotice(
        runCompleteness([sidebar, drawer], { measured: [sidebar, drawer] }),
      ),
    ).toBe('Complete run: all 2 planned scenarios are accounted for.');
  });
});
