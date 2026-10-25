import { fileURLToPath } from 'node:url';
import { startPluginTest, type PluginTest } from '@argo/plugin-kit/testing';
import { expect, onTestFinished } from 'vitest';

export type View = ReturnType<PluginTest['slot']>;

type Node = NonNullable<View['tree']>;

export const rectType = 'Canvas.Rect';

const startAtlas = (folder: string): Promise<PluginTest> =>
  startPluginTest({
    directory: fileURLToPath(new URL('..', import.meta.url)),
    pluginId: 'atlas',
    version: '0.0.1',
    projects: [{ id: 'project-1', name: 'Fixture Project', originUrl: null }],
    projectPaths: { 'project-1': folder },
  });

// The Plugin's Project details view for a Project at `folder`.
export async function atlas(folder: string): Promise<View> {
  const test = await startAtlas(folder);

  onTestFinished(async () => {
    expect(await test.log()).not.toContain('refused');
    await test.close();
  });

  return test.slot({
    slotId: 'argo/project/details/v1',
    context: { projectId: 'project-1' },
  });
}

function descendants(node: Node, type: string): Node[] {
  const children = (node.children ?? []).flatMap((child) =>
    typeof child === 'object' ? descendants(child, type) : [],
  );

  return node.type === type ? [node, ...children] : children;
}

export const nodes = (view: View, type: string): Node[] =>
  view.tree ? descendants(view.tree, type) : [];

export const canvas = (view: View): Node | undefined =>
  nodes(view, 'Canvas')[0];

// The App outlines the rectangle whose key the Canvas names.
export function selectedRect(view: View): Node | undefined {
  const key = canvas(view)?.props.selectedKey;

  return nodes(view, rectType).find((rect) => rect.key === key);
}

export const field = (view: View, title: string): Node | undefined =>
  view.findText(title)?.node;

const labelOf = ({ props }: Node): string[] =>
  typeof props.label === 'string' ? [props.label] : [];

// The drawn files' labels, in path order.
export const labels = (view: View): string[] =>
  nodes(view, rectType)
    .flatMap(labelOf)
    .sort((a, b) => a.localeCompare(b));
