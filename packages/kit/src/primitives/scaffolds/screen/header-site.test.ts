import { describe, expect, it } from 'vitest';
import { headerPlan, type HeaderFacts, type HeaderSite } from './header-site';

const facts = (extra: Partial<HeaderFacts>): HeaderFacts => ({
  kind: 'screen',
  listColumn: false,
  navigator: false,
  wide: false,
  web: true,
  ...extra,
});

const siteOf = (extra: Partial<HeaderFacts>): HeaderSite =>
  headerPlan(facts(extra)).site;

describe('a Screen with a body', () => {
  it.each<[string, Partial<HeaderFacts>, HeaderSite]>([
    ['in a list column, wide', { listColumn: true, wide: true }, 'list column'],
    ['in a list column, narrow', { listColumn: true }, 'list column'],
    ['wide, with a navigator', { wide: true, navigator: true }, 'heading'],
    ['wide, without one', { wide: true }, 'heading'],
    ['narrow, with a navigator', { navigator: true }, 'stack'],
    ['narrow, no navigator, web', { web: true }, 'heading'],
    ['narrow, no navigator, native', { web: false }, 'none'],
  ])('%s draws at %s', (_name, extra, site) => {
    expect(siteOf(extra)).toBe(site);
  });
});

describe('a header-only Screen', () => {
  it.each<[string, Partial<HeaderFacts>, HeaderSite]>([
    ['wide, with a navigator', { wide: true, navigator: true }, 'band'],
    ['wide, without one', { wide: true }, 'band'],
    ['narrow, with a navigator', { navigator: true }, 'stack'],
    ['narrow, no navigator, web', { web: true }, 'none'],
    ['narrow, no navigator, native', { web: false }, 'none'],
    ['in a list column, narrow', { listColumn: true }, 'none'],
  ])('%s draws at %s', (_name, extra, site) => {
    expect(siteOf({ ...extra, kind: 'header only' })).toBe(site);
  });
});

describe('the stack entry', () => {
  it('is held whenever a navigator has one, even while the stack header is hidden', () => {
    const plan = headerPlan(facts({ wide: true, navigator: true }));

    expect(plan).toEqual({ site: 'heading', stackEntry: true });
  });

  it('is not held without a navigator', () => {
    expect(headerPlan(facts({ wide: true })).stackEntry).toBe(false);
  });

  it('is not held by a Screen whose header goes up to a list column', () => {
    const plan = headerPlan(facts({ listColumn: true, navigator: true }));

    expect(plan.stackEntry).toBe(false);
  });
});
