import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startPluginTest, type OpenPage } from '@argo/plugin-kit/testing';
import { expect, it, onTestFinished } from 'vitest';

type Node = OpenPage['tree'];

// The Engine's limit on a drawn page, in bytes.
const pageBytes = 1_047_552;

// A Project folder whose marker file tells the fixture git what to answer.
async function projectFolder(marker?: string): Promise<string> {
  const folder = await mkdtemp(join(tmpdir(), 'code-map-'));
  onTestFinished(() => rm(folder, { recursive: true, force: true }));

  if (marker) await writeFile(join(folder, marker), '');

  return folder;
}

const app = 'src/app.ts';

const rectType = 'Canvas.Rect';

async function codeMap(marker?: string): Promise<OpenPage> {
  const folder = await projectFolder(marker);

  const test = await startPluginTest({
    directory: fileURLToPath(new URL('.', import.meta.url)),
    pluginId: 'code-map',
    version: '0.0.1',
    projects: [{ id: 'project-1', name: 'Fixture Project', originUrl: null }],
    projectPaths: { 'project-1': folder },
    path: [fileURLToPath(new URL('./mocks', import.meta.url))],
  });

  onTestFinished(async () => {
    expect(await test.log()).not.toContain('refused');
    await test.close();
  });

  // The map is a Loader page, opened for the Project whose details row drilled into it (ADR-0046).
  return test.pages.open({ path: '/map', projectId: 'project-1' });
}

function descendants(node: Node, type: string): Node[] {
  const children = (node.children ?? []).flatMap((child) =>
    typeof child === 'object' ? descendants(child, type) : [],
  );

  return node.type === type ? [node, ...children] : children;
}

const nodes = (page: OpenPage, type: string): Node[] =>
  descendants(page.tree, type);

const canvas = (page: OpenPage): Node | undefined => nodes(page, 'Canvas')[0];

// The App outlines the rectangle whose key the Canvas names.
function selectedRect(page: OpenPage): Node | undefined {
  const key = canvas(page)?.props.selectedKey;

  return nodes(page, rectType).find((rect) => rect.key === key);
}

const field = (page: OpenPage, title: string): Node | undefined =>
  page.findText(title)?.node;

it('draws each text file of the Project, named by its path', async () => {
  const page = await codeMap();
  expect(canvas(page)).toBeDefined();

  expect(nodes(page, rectType).map((rect) => rect.props.label)).toEqual([
    'README.md',
    app,
    'src/lib/parse.ts',
  ]);
});

it('selects a file and shows what the map measured', async () => {
  const page = await codeMap();
  await page.press(
    (node) => node.type === rectType && node.props.label === app,
  );

  expect(selectedRect(page)).toMatchObject({ props: { label: app } });
  expect(field(page, 'Lines')).toMatchObject({ props: { text: '120' } });
  expect(field(page, 'Branching lines')).toMatchObject({
    props: { text: '24' },
  });
  expect(field(page, 'Changes')).toMatchObject({ props: { text: '2' } });
});

it('says so when git cannot read the Project', async () => {
  const page = await codeMap('broken');

  page.find('Could not read this Project’s files.');
  expect(canvas(page)).toBeUndefined();
});

it('draws the largest files of a big Project within the page limit', async () => {
  const page = await codeMap('large');
  page.find('Showing the 2,500 largest of 3,000 files.');

  expect(nodes(page, rectType)).toHaveLength(2500);
  expect(Buffer.byteLength(JSON.stringify(page.tree))).toBeLessThan(pageBytes);
});
