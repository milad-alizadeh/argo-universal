import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startPluginTest, type PluginTest } from '@argo/plugin-kit/testing';
import { expect, it, onTestFinished } from 'vitest';

type View = ReturnType<PluginTest['page']>;

type Node = NonNullable<View['tree']>;

// The Engine's limit on a drawn page, in bytes.
const pageBytes = 1_047_552;

const wait = { timeout: 10_000 };

// A Project folder whose marker file tells the fixture git what to answer.
async function projectFolder(marker?: string): Promise<string> {
  const folder = await mkdtemp(join(tmpdir(), 'code-map-'));
  onTestFinished(() => rm(folder, { recursive: true, force: true }));

  if (marker) await writeFile(join(folder, marker), '');

  return folder;
}

const app = 'src/app.ts';

const rectType = 'Canvas.Rect';

async function codeMap(marker?: string): Promise<View> {
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

  // The map is a page now, opened for the Project whose details row drilled into it (ADR-0046).
  return test.page('/map', undefined, 'project-1');
}

function descendants(node: Node, type: string): Node[] {
  const children = (node.children ?? []).flatMap((child) =>
    typeof child === 'object' ? descendants(child, type) : [],
  );

  return node.type === type ? [node, ...children] : children;
}

const nodes = (view: View, type: string): Node[] =>
  view.tree ? descendants(view.tree, type) : [];

const canvas = (view: View): Node | undefined => nodes(view, 'Canvas')[0];

// The App outlines the rectangle whose key the Canvas names.
function selectedRect(view: View): Node | undefined {
  const key = canvas(view)?.props.selectedKey;

  return nodes(view, rectType).find((rect) => rect.key === key);
}

const field = (view: View, title: string): Node | undefined =>
  view.findText(title)?.node;

it('draws each text file of the Project, named by its path', async () => {
  const view = await codeMap();
  await expect.poll(() => canvas(view), wait).toBeDefined();

  expect(nodes(view, rectType).map((rect) => rect.props.label)).toEqual([
    'README.md',
    app,
    'src/lib/parse.ts',
  ]);
});

it('selects a file and shows what the map measured', async () => {
  const view = await codeMap();
  await view.find(app);
  await view.press(app);

  await expect
    .poll(() => selectedRect(view), wait)
    .toMatchObject({ props: { label: app } });
  expect(field(view, 'Lines')).toMatchObject({ props: { text: '120' } });
  expect(field(view, 'Branching lines')).toMatchObject({
    props: { text: '24' },
  });
  expect(field(view, 'Changes')).toMatchObject({ props: { text: '2' } });
});

it('says so when git cannot read the Project', async () => {
  const view = await codeMap('broken');

  await view.find('Could not read this Project’s files.');
  expect(canvas(view)).toBeUndefined();
});

it('draws the largest files of a big Project within the page limit', async () => {
  const view = await codeMap('large');
  await view.find('Showing the 2,500 largest of 3,000 files.');

  expect(nodes(view, rectType)).toHaveLength(2500);
  expect(Buffer.byteLength(JSON.stringify(view.tree))).toBeLessThan(pageBytes);
});
