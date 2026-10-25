import { afterEach, describe, expect, it, vi } from 'vitest';
import { PreviewUnavailable } from './preview-unavailable';
import { PreviewFixture, guide } from './preview.mocks';

afterEach(() => vi.restoreAllMocks());

describe('Link preview of a web page', () => {
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

  it.each([
    'file:///etc/passwd',
    'mailto:hello@example.com',
    'https://127.0.0.1',
    'https://[::1]',
    'https://169.254.169.254',
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
        '<meta property="og:title" content="Safe"><meta property="og:image" content="https://127.0.0.1/image">',
      ),
    });
    expect(await fixture.caller.get({ href: guide })).toMatchObject({
      kind: 'web',
      title: 'Safe',
    });
    expect(fixture.read).toHaveBeenCalledTimes(1);
    expect(fixture.storeImage).not.toHaveBeenCalled();
  });

  it('keeps the text card without a report when an image cannot be fetched', async () => {
    const diagnostic = vi.spyOn(console, 'error').mockImplementation(() => {});
    const fixture = new PreviewFixture();
    fixture.read.mockImplementation(async (url) => {
      if (url.endsWith('.png')) throw new PreviewUnavailable('Not OK');

      return {
        url,
        type: 'text/html',
        bytes: Buffer.from(
          '<meta property="og:title" content="Safe"><meta property="og:image" content="/cover.png">',
        ),
      };
    });
    expect(await fixture.caller.get({ href: guide })).toMatchObject({
      kind: 'web',
      title: 'Safe',
    });
    expect(diagnostic).not.toHaveBeenCalled();
  });
});
