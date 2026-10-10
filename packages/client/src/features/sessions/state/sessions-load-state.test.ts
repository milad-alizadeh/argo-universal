import { describe, expect, it } from 'vitest';
import { type QueryProgress, sessionsLoadState } from './sessions-load-state';

const loaded: QueryProgress = { failed: false, pending: false };
const pending: QueryProgress = { failed: false, pending: true };
const failed: QueryProgress = { failed: true, pending: false };

describe('sessionsLoadState', () => {
  it('is ready when every query has loaded', () => {
    expect(sessionsLoadState([loaded, loaded, loaded])).toBe('ready');
  });

  it('is loading while any query is pending', () => {
    expect(sessionsLoadState([loaded, pending, loaded])).toBe('loading');
  });

  it('is an error when a query failed and none is pending', () => {
    expect(sessionsLoadState([loaded, failed, loaded])).toBe('error');
  });

  it('keeps loading while one query is pending even if another failed', () => {
    expect(sessionsLoadState([failed, pending, loaded])).toBe('loading');
  });
});
