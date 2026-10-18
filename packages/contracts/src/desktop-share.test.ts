import { expect, it } from 'vitest';
import { DesktopShare } from './desktop-share';

it('accepts text and web URLs for native sharing', () => {
  const content = {
    message: 'Shared from a Plugin',
    title: 'Argo',
    url: 'https://example.com/project',
  };

  expect(DesktopShare.parse(content)).toEqual(content);
});

it.each([
  { message: 'Local file', url: 'file:///etc/passwd' },
  { message: 'Script', url: 'javascript:alert(1)' },
  { message: 'File', filePaths: ['/etc/passwd'] },
])('rejects native file and executable share input: %j', (content) => {
  expect(DesktopShare.safeParse(content).success).toBe(false);
});
