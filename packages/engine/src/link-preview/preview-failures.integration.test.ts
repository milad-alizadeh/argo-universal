import { afterEach, describe, expect, it, vi } from 'vitest';
import { PreviewUnavailable } from './preview-unavailable';
import { PreviewFixture, guide, issueUrl } from './preview.mocks';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('Link preview when a page gives no preview', () => {
  it('returns no preview for a page without OpenGraph or a failed private GitHub query', async () => {
    const fixture = new PreviewFixture();
    fixture.read.mockResolvedValueOnce({
      url: guide,
      type: 'text/html',
      bytes: Buffer.from('<title>No OpenGraph</title>'),
    });
    expect(await fixture.caller.get({ href: guide })).toBeNull();
    fixture.github.mockRejectedValueOnce(new PreviewUnavailable('Not found'));
    expect(await fixture.caller.get({ href: issueUrl })).toBeNull();
    expect(fixture.read).toHaveBeenCalledTimes(1);
  });

  it('refreshes a failed preview after the negative cache expires', async () => {
    vi.useFakeTimers();
    const fixture = new PreviewFixture();
    fixture.github.mockRejectedValueOnce(
      new PreviewUnavailable('Not signed in'),
    );
    expect(await fixture.caller.get({ href: issueUrl })).toBeNull();
    expect(await fixture.caller.get({ href: issueUrl })).toBeNull();
    expect(fixture.github).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(30_001);
    expect(await fixture.caller.get({ href: issueUrl })).toMatchObject({
      kind: 'issue',
    });
    expect(fixture.github).toHaveBeenCalledTimes(2);
  });

  it('returns no preview without a report when the page cannot be fetched', async () => {
    const diagnostic = vi.spyOn(console, 'error').mockImplementation(() => {});
    const fixture = new PreviewFixture();
    fixture.read.mockRejectedValueOnce(new PreviewUnavailable('Not OK'));
    expect(await fixture.caller.get({ href: guide })).toBeNull();
    expect(diagnostic).not.toHaveBeenCalled();
  });

  it('reports and counts a fault fetching a page, and shows no preview', async () => {
    const diagnostic = vi.spyOn(console, 'error').mockImplementation(() => {});
    const fixture = new PreviewFixture();
    const fault = new TypeError('Cannot read properties of undefined');
    fixture.github.mockRejectedValueOnce(fault);
    expect(await fixture.caller.get({ href: issueUrl })).toBeNull();
    expect(diagnostic).toHaveBeenCalledExactlyOnceWith(
      expect.stringMatching(/^Link preview: Unexpected preview failure #\d+$/u),
      fault,
    );
  });

  it('reports and counts a fault storing an image, and shows no preview', async () => {
    const diagnostic = vi.spyOn(console, 'error').mockImplementation(() => {});
    const fixture = new PreviewFixture();
    const fault = new Error('database is locked');
    fixture.storeImage.mockRejectedValueOnce(fault);
    expect(await fixture.caller.get({ href: guide })).toBeNull();
    expect(diagnostic).toHaveBeenCalledExactlyOnceWith(
      expect.stringMatching(/^Link preview: Unexpected preview failure #\d+$/u),
      fault,
    );
  });
});
