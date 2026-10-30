import type { PluginTestView } from '@argo/plugin-kit/testing';
import { expect, it } from 'vitest';
import { startKit } from '../mocks/kit-page-helpers';

type Node = NonNullable<PluginTestView['tree']>;

type Patch = Extract<NonNullable<PluginTestView['message']>, { type: 'patch' }>;

type SetProps = Extract<Patch['ops'][number], { op: 'setProps' }>;

// Canvas is the kit part and a Plugin sends shapes as data (ADR-0028), so each platform mounts the same shapes.
const source = `import { Action, Canvas, Screen, Stack, useState } from '@argo/plugin-kit';

const days = Array.from({ length: 4 }, (_, index) => ({ key: 'day-' + index, x: 8 + index * 29, y: 8 }));
const files = [{ key: 'packages-0', label: 'packages/file-0.ts', x: 8, y: 8 }, { key: 'packages-1', label: 'packages/file-1.ts', x: 8, y: 40 }];

function Page() {
  const [intensity, setIntensity] = useState(0.5);
  const [selected, setSelected] = useState('packages-0');
  return (
    <Screen title="Canvas" primaryAction={<Action key="change" label="Change one shape" icon="add" onPress={() => setIntensity(1)} />}>
      <Stack direction="column" gap={4}>
        <Canvas width={160} height={48} camera="pan-zoom" label="Activity" selectedKey="">
          {days.map((day) => (
            <Canvas.Rect key={day.key} x={day.x} y={day.y} width={25} height={25} tone="accent" intensity={day.key === 'day-2' ? intensity : 0.25} label={'Day ' + day.key.slice(4) + (day.key === 'day-2' ? ': ' + intensity : '')} />
          ))}
        </Canvas>
        <Canvas width={160} height={80} camera="pan-zoom" label="Project files" selectedKey={selected}>
          {files.map((file) => (
            <Canvas.Rect key={file.key} x={file.x} y={file.y} width={100} height={28} tone="accent" intensity={0.25} label={file.label} onPress={() => setSelected(file.key)} />
          ))}
        </Canvas>
      </Stack>
    </Screen>
  );
}

export function register(argo) {
  argo.pages.register('/', Page);
}`;

function canvases(node: Node | null): Node[] {
  if (!node) return [];

  if (node.type === 'Canvas') return [node];

  return node.children.flatMap(canvases);
}

for (const platform of ['ios', 'android', 'desktop'] as const)
  it(`mounts Canvas.Rect shapes and selects one on press on ${platform}`, async () => {
    const kit = await startKit(source);
    const page = await kit.mount({ page: '/', surface: { platform } });
    expect((await page.find('Day 0')).type).toBe('Canvas.Rect');
    expect((await page.find('packages/file-1.ts')).type).toBe('Canvas.Rect');

    const selectedKey = (): string => {
      const canvas = canvases(page.tree).find(
        (node) => node.props.label === 'Project files',
      );

      return JSON.stringify(canvas?.props.selectedKey);
    };

    expect(selectedKey()).toBe('"packages-0"');
    await page.press('packages/file-1.ts');
    await kit.clock.advance(16);
    await page.waitFor(() => selectedKey() === '"packages-1"');
  });

it('sends one keyed patch when one shape changes', async () => {
  const kit = await startKit(source);

  const page = await kit.mount({
    page: '/',
    surface: { platform: 'desktop' },
  });

  await page.find('Day 2: 0.5');
  await page.press('Change one shape');
  await kit.clock.advance(16);
  await page.find('Day 2: 1');

  const op = soleSetProps(page);

  expect(op.props).toEqual({ intensity: 1, label: 'Day 2: 1' });
  expect(op.key.at(-1)).toBe('day-2');
});

function patchOps(page: PluginTestView): Patch['ops'] {
  const { message } = page;

  if (message?.type !== 'patch') throw new Error('Expected a patch');

  return message.ops;
}

// The patch holds exactly one op, and it is a keyed `setProps`.
function soleSetProps(page: PluginTestView): SetProps {
  const ops = patchOps(page);

  expect(ops).toHaveLength(1);

  const [op] = ops;

  if (op?.op !== 'setProps') throw new Error('Expected a setProps op');

  return op;
}
