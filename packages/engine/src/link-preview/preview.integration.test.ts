import { afterEach, describe, expect, it, vi } from 'vitest';
import { PreviewFixture, item } from './preview.mocks';

const guide = 'https://example.com/guide';

const issueUrl = 'https://github.com/acme/private/issues/42';

const pullUrl = 'https://github.com/acme/private/pull/42';

afterEach(() => vi.useRealTimers());

describe('Link preview query', () => {
  it('fetches OpenGraph and proxies images once for concurrent readers', async () => {
    const fixture = new PreviewFixture();

    const [first, second] = await Promise.all([
      fixture.caller.get({ href: `${guide}#intro` }),
      fixture.caller.get({ href: `${guide}#other` }),
    ]);

    expect(first).toEqual({
      kind: 'web',
      title: 'A & B',
      description: 'Preview description',
      domain: 'example.com',
      image: { blobId: 'stored-image', mime: 'image/png', bytes: 8 },
    });
    expect(second).toEqual(first);
    expect(fixture.read).toHaveBeenCalledTimes(2);
    expect(fixture.storeImage).toHaveBeenCalledTimes(1);
    await fixture.caller.get({ href: guide });
    expect(fixture.read).toHaveBeenCalledTimes(2);
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
    'file:///etc/passwd',
    'mailto:hello@example.com',
    'http://127.0.0.1',
    'http://[::1]',
    'http://169.254.169.254',
    'https://user:secret@example.com',
    'https://example.com:9000',
  ])('refuses %s before making any request', async (href) => {
    const fixture = new PreviewFixture();
    expect(await fixture.caller.get({ href })).toBeNull();
    expect(fixture.read).not.toHaveBeenCalled();
    expect(fixture.github).not.toHaveBeenCalled();
  });

  it('keeps the text card when an image is refused and never stores active content', async () => {
    const fixture = new PreviewFixture();
    fixture.read.mockResolvedValueOnce({
      url: guide,
      type: 'text/html',
      bytes: Buffer.from(
        '<meta property="og:title" content="Safe"><meta property="og:image" content="http://127.0.0.1/image">',
      ),
    });
    expect(await fixture.caller.get({ href: guide })).toMatchObject({
      kind: 'web',
      title: 'Safe',
    });
    expect(fixture.read).toHaveBeenCalledTimes(1);
    expect(fixture.storeImage).not.toHaveBeenCalled();
  });

  it('returns no preview for a page without OpenGraph or a failed private GitHub query', async () => {
    const fixture = new PreviewFixture();
    fixture.read.mockResolvedValueOnce({
      url: guide,
      type: 'text/html',
      bytes: Buffer.from('<title>No OpenGraph</title>'),
    });
    expect(await fixture.caller.get({ href: guide })).toBeNull();
    fixture.github.mockRejectedValueOnce(new Error('Not found'));
    expect(await fixture.caller.get({ href: issueUrl })).toBeNull();
    expect(fixture.read).toHaveBeenCalledTimes(1);
  });

  it('refreshes a failed preview after the negative cache expires', async () => {
    vi.useFakeTimers();
    const fixture = new PreviewFixture();
    fixture.github.mockRejectedValueOnce(new Error('Not signed in'));
    expect(await fixture.caller.get({ href: issueUrl })).toBeNull();
    expect(await fixture.caller.get({ href: issueUrl })).toBeNull();
    expect(fixture.github).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(30_001);
    expect(await fixture.caller.get({ href: issueUrl })).toMatchObject({
      kind: 'issue',
    });
    expect(fixture.github).toHaveBeenCalledTimes(2);
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
