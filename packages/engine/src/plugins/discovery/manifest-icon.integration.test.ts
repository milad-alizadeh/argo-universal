import { rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { makeResolvedTempFolder } from '@repo/mocks/fs/resolved-temp-folder';
import { expect, it, onTestFinished } from 'vitest';
import { iconByteLimit, readIconMarkup } from './manifest-icon';

const file = 'icon.svg';

// A Plugin folder holding this icon file, when given.
async function folderWith(svg?: string): Promise<string> {
  const folder = await makeResolvedTempFolder('argo-icon-');
  onTestFinished(() => rm(folder, { recursive: true, force: true }));

  if (svg !== undefined) await writeFile(join(folder, file), svg);

  return folder;
}

const read = async (svg?: string): Promise<string | undefined> =>
  readIconMarkup(await folderWith(svg), { svg: file });

it('draws a coloured icon in one colour, the tint the App gives it', async () => {
  const markup = await read(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48"><path fill="#0052CC" d="M2 2h20v20H2z"/><path stroke="red" fill="none" d="M4 4l16 16"/></svg>',
  );

  expect(markup).toContain('fill="currentColor"');
  expect(markup).toContain('stroke="currentColor"');
  expect(markup).toContain('fill="none"');
  expect(markup).not.toMatch(/#0052CC|red|width=|height=/);
});

it('paints an icon that sets no colour of its own', async () => {
  const markup = await read(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M2 2h20v20H2z"/></svg>',
  );

  expect(markup).toMatch(/^<svg[^>]*fill="currentColor"/);
});

it('has no icon for a manifest that names no svg file', async () => {
  await expect(
    readIconMarkup(await folderWith(), { sf: 'ticket' }),
  ).resolves.toBeUndefined();
});

it.each([
  ['a missing file', undefined, 'icon.svg icon.svg is missing'],
  [
    'a second colour',
    '<svg xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g"/></defs><path fill="url(#g)" d="M0 0h1v1z"/></svg>',
    'icon.svg must be one colour; it holds a linearGradient',
  ],
  ['markup that is not SVG', '<html></html>', 'icon.svg is refused'],
  [
    'a file over the cap',
    `<svg xmlns="http://www.w3.org/2000/svg"><path d="${'M0 0'.repeat(iconByteLimit)}"/></svg>`,
    `icon.svg must be at most ${iconByteLimit} bytes`,
  ],
])('refuses %s', async (_case, svg, message) => {
  await expect(read(svg)).rejects.toThrow(message);
});
