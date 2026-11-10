import { afterEach, describe, expect, it, vi } from 'vitest';
import { PreviewFixture, issueUrl, item, pullUrl } from './preview.mocks';

describe('Link preview of a GitHub link', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('asks GitHub again for a pull request a few seconds later, so a closed one stops reading open', async () => {
    vi.useFakeTimers();
    const fixture = new PreviewFixture();
    fixture.github
      .mockResolvedValueOnce(item)
      .mockResolvedValueOnce({ ...item, state: 'closed' });
    expect(await fixture.caller.get({ href: pullUrl })).toMatchObject({
      state: 'open',
    });
    expect(await fixture.caller.get({ href: pullUrl })).toMatchObject({
      state: 'open',
    });
    vi.advanceTimersByTime(11_000);
    expect(await fixture.caller.get({ href: pullUrl })).toMatchObject({
      state: 'closed',
    });
    expect(fixture.github).toHaveBeenCalledTimes(2);
  });

  it('uses Server GitHub access for private issues without fetching their page', async () => {
    const fixture = new PreviewFixture();
    expect(await fixture.caller.get({ href: issueUrl })).toMatchObject({
      kind: 'issue',
      title: 'Fix hover cards',
      number: 42,
      repository: 'acme/private',
      state: 'open',
      author: 'octocat',
    });
    expect(fixture.github).toHaveBeenCalledWith('repos/acme/private/issues/42');
    expect(fixture.read).not.toHaveBeenCalled();
  });

  it.each([
    { state: 'open', draft: true, expected: 'draft' },
    { state: 'closed', draft: true, expected: 'closed' },
    { state: 'closed', merged_at: '2026-10-20T12:00:00Z', expected: 'merged' },
  ] as const)(
    'draws a $expected pull request with its diff totals',
    async ({ expected, ...state }) => {
      const fixture = new PreviewFixture();
      fixture.github.mockResolvedValueOnce({
        ...item,
        ...state,
        additions: 18,
        deletions: 4,
      });
      expect(await fixture.caller.get({ href: pullUrl })).toMatchObject({
        kind: 'pullRequest',
        state: expected,
        additions: 18,
        deletions: 4,
      });
      expect(fixture.github).toHaveBeenCalledWith(
        'repos/acme/private/pulls/42',
      );
    },
  );

  it('uses a commit first line and falls back to its author when no GitHub user exists', async () => {
    const fixture = new PreviewFixture();
    fixture.github.mockResolvedValueOnce({
      sha: 'abcdef0123456789',
      author: null,
      commit: {
        message: 'Fix the card\n\nMore detail',
        author: { name: 'A Person', date: item.created_at },
      },
    });
    expect(
      await fixture.caller.get({
        href: 'https://github.com/acme/private/commit/abcdef0',
      }),
    ).toMatchObject({
      kind: 'commit',
      sha: 'abcdef0',
      title: 'Fix the card',
      author: 'A Person',
    });
  });
});
