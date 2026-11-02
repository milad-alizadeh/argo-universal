import { vi } from 'vitest';
import { serverDeviceContext } from '#mocks/rpc-context';
import { createLinkPreviewRouter } from './router';
import type { PreviewSources } from './sources';

const html =
  '<head><meta content="A &amp; B" property="og:title"><meta property="og:description" content="Preview description"><meta property="og:image" content="/cover.png"></head>';

const image = Buffer.from('89504e470d0a1a0a', 'hex');

export const guide = 'https://example.com/guide';

export const issueUrl = 'https://github.com/acme/private/issues/42';

export const pullUrl = 'https://github.com/acme/private/pull/42';

export const item = {
  title: 'Fix hover cards',
  state: 'open',
  number: 42,
  created_at: '2026-10-19T12:00:00Z',
  user: { login: 'octocat' },
} as const;

export class PreviewFixture {
  public readonly read = vi.fn<PreviewSources['read']>(async (url) => ({
    url,
    type: url.endsWith('.png') ? 'image/png' : 'text/html; charset=utf-8',
    bytes: url.endsWith('.png') ? image : Buffer.from(html),
  }));
  public readonly github = vi.fn<PreviewSources['github']>(async () => item);
  public readonly storeImage = vi.fn<PreviewSources['storeImage']>(
    async () => ({
      blobId: 'stored-image',
      mime: 'image/png',
      bytes: image.length,
    }),
  );
  public readonly caller = createLinkPreviewRouter(this).createCaller(
    serverDeviceContext(),
  );
}
