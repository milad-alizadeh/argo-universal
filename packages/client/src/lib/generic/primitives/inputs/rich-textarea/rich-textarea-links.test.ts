import { describe, expect, it } from 'vitest';
import { isLinkUrl } from './rich-textarea-links';

describe('A pasted text links the selection', () => {
  it.each([
    'https://github.com/argo/universal/issues/443',
    'http://localhost:8081/sessions?id=a_b',
    'mailto:team@argo.dev',
  ])('when it is the URL %s', (text) => {
    expect(isLinkUrl(text)).toBe(true);
  });

  it.each([
    'Composer spec',
    'github.com/argo/universal',
    'https://argo.dev and more',
    ' https://argo.dev',
    'javascript:alert(1)',
    'file:///etc/hosts',
    '',
  ])('not when it is %j', (text) => {
    expect(isLinkUrl(text)).toBe(false);
  });
});
