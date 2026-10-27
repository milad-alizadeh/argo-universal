import { afterEach, describe, expect, it, vi } from 'vitest';
import { cachedSvgText, forgetSvgTexts, loadSvgText } from './svg-text-cache';

const uri = 'https://cdn.example.test/claude.svg';

const svg = '<svg xmlns="http://www.w3.org/2000/svg"/>';

const answer = (body: string, status = 200): Response =>
  new Response(body, { status });

afterEach(() => {
  forgetSvgTexts();
  vi.unstubAllGlobals();
});

describe('svg text cache', () => {
  it('fetches a logo once however many times it is asked for', async () => {
    const fetcher = vi.fn<typeof fetch>(() => Promise.resolve(answer(svg)));
    vi.stubGlobal('fetch', fetcher);

    await loadSvgText(uri);
    await loadSvgText(uri);
    await loadSvgText(uri);

    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('shares one fetch between logos asking at once', async () => {
    const fetcher = vi.fn<typeof fetch>(() => Promise.resolve(answer(svg)));
    vi.stubGlobal('fetch', fetcher);

    const texts = await Promise.all([loadSvgText(uri), loadSvgText(uri)]);

    expect(texts).toEqual([svg, svg]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('has the text ready to read, with no wait, once it was fetched', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve(answer(svg)));

    expect(cachedSvgText(uri)).toBeUndefined();

    await loadSvgText(uri);

    expect(cachedSvgText(uri)).toBe(svg);
  });

  it('forgets a failed fetch, so the next mount tries again', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(answer('missing', 404))
      .mockResolvedValueOnce(answer(svg));

    vi.stubGlobal('fetch', fetcher);

    await expect(loadSvgText(uri)).rejects.toThrow('404');

    expect(cachedSvgText(uri)).toBeUndefined();

    await expect(loadSvgText(uri)).resolves.toBe(svg);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('decodes a base64 data URI without fetching', async () => {
    const fetcher = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetcher);

    const encoded = `data:image/svg+xml;base64,${btoa(svg)}`;

    await expect(loadSvgText(encoded)).resolves.toBe(svg);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
