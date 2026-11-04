import type { OpenPage } from '@argo/plugin-kit/testing';
import { expect, it } from 'vitest';
import { startKit } from '../mocks/kit-page-helpers';

type Node = OpenPage['tree'];

// Canvas is the kit part and a Plugin sends shapes as data (ADR-0028), so each platform draws the same shapes; `/files` keeps its selection in Page state.
const source = `import { Canvas } from '@argo/plugin-kit';

const files = [{ key: 'packages-0', label: 'packages/file-0.ts', x: 8, y: 8 }, { key: 'packages-1', label: 'packages/file-1.ts', x: 8, y: 40 }];

const projectFiles = (selected, to) => (
  <Canvas width={160} height={80} camera="pan-zoom" label="Project files" selectedKey={selected}>
    {files.map((file) => (
      <Canvas.Rect key={file.key} x={file.x} y={file.y} width={100} height={28} tone="accent" intensity={0.25} label={file.label} onPress={to.set({ selected: file.key })} />
    ))}
  </Canvas>
);

export function register(argo) {
  argo.pages.define('/files', {
    state: { selected: 'packages-0' },
    load: () => null,
    render: (_data, to, { state }) => projectFiles(state.selected, to),
  });
}`;

for (const platform of ['ios', 'android', 'desktop'] as const)
  it(`draws Canvas.Rect shapes and selects one on press on ${platform}`, async () => {
    const kit = await startKit(source);
    const page = await kit.pages.open({ path: '/files', platform });
    expect(page.find('packages/file-0.ts').type).toBe('Canvas.Rect');

    const selectedKey = (): Node['props'][string] | undefined =>
      page.find('Project files').props.selectedKey;

    expect(selectedKey()).toBe('packages-0');
    await page.press('packages/file-1.ts');
    expect(selectedKey()).toBe('packages-1');
  });
