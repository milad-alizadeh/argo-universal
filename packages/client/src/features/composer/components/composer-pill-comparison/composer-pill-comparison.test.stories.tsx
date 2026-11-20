import {
  nativeGlassFixture,
  nativeMaterialLabel,
} from '@repo/kit/mocks/native-glass';
import { settleLayout } from '@repo/kit/mocks/story-layout';
import { LiquidGlassPlatform } from '@repo/kit/primitives/content/liquid-glass';
import type { Decorator, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { expect, fn, isInaccessible, waitFor, within } from 'storybook/test';
import { sharedControls } from './composer-pill-comparison-fixtures';
import comparisonMeta, {
  SharedControls,
} from './composer-pill-comparison.stories';

const native = nativeGlassFixture();

const withNativeGlass: Decorator = (Story): ReactElement => (
  <LiquidGlassPlatform value={native.platform}>
    <Story />
  </LiquidGlassPlatform>
);

const meta = {
  ...comparisonMeta,
  title: 'Tests/Composer/ComposerPillComparison',
  globals: { mode: 'light' },
  decorators: [...comparisonMeta.decorators, withNativeGlass],
};

export default meta;

type Story = StoryObj<typeof meta>;

const modelLabel = 'Agent and model';

const agentsLabel = 'Agents: 2';

const tasksLabel = 'Background Tasks: 1';

const names = [
  'Todos',
  agentsLabel,
  tasksLabel,
  modelLabel,
  'Mode',
  'Context window',
];

function sharedGeometry(width: number): Story {
  return {
    ...SharedControls,
    beforeEach: () => settleLayout(width),
    play: async ({ canvas }) => {
      await expectSharedGeometry(canvas);
      await expectMaterialPolicy(canvas, width === 390);

      if (width !== 390) {
        const usage = canvas.getByRole('button', { name: 'Usage' });
        await expectControlGeometry(usage);
        await expect(within(usage).queryByRole('group')).toBeNull();
      }

      await expectLabelInset(canvas.getByRole('button', { name: 'Mode' }));
    },
  };
}

const tallControls = new Set([agentsLabel, tasksLabel, 'Todos']);

async function expectSharedGeometry(
  canvas: ReturnType<typeof within>,
): Promise<void> {
  for (const name of names)
    await expectControlGeometry(
      canvas.getByRole('button', { name }),
      tallControls.has(name) ? 32 : 28,
    );
}

async function expectControlGeometry(
  button: HTMLElement,
  height = 28,
): Promise<void> {
  await expect(button.getBoundingClientRect().height).toBeCloseTo(height, 0);
  await expect(within(button).queryAllByRole('button')).toHaveLength(0);
}

async function expectLabelInset(button: HTMLElement): Promise<void> {
  const label = within(button)
    .getAllByText(/\S/)
    .find((element) => !isInaccessible(element));

  if (!label) throw new Error('Mode needs a visible pill label.');

  await expect(
    label.getBoundingClientRect().left - button.getBoundingClientRect().left,
  ).toBeCloseTo(11, 0);
}

export const CompactGeometry = sharedGeometry(390);

export const DesktopGeometry = sharedGeometry(1440);

const openAgents = fn();

export const AgentCountRetainsItsAction: Story = {
  ...SharedControls,
  args: {
    ...sharedControls,
    status: {
      ...sharedControls.status,
      subagents: { ...sharedControls.status.subagents, onPress: openAgents },
    },
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: agentsLabel }));
    await expect(openAgents).toHaveBeenCalledOnce();
  },
};

export const ModelRetainsItsConfigurationOverlay: Story = {
  ...SharedControls,
  beforeEach: () => settleLayout(1440),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: modelLabel }));
    await waitFor(() =>
      expect(
        within(document.body).getByRole('dialog', { name: modelLabel }),
      ).toBeVisible(),
    );
  },
};

const glassControls = [agentsLabel, tasksLabel];

const plainControls = [modelLabel, 'Mode', 'Context window'];

// A phone floats the Plan above the card as glass; a wide window draws it as the tray's own row, never a pill.
const materialGroups = (compact: boolean): [string[], string[]] =>
  compact
    ? [[...glassControls, 'Todos'], plainControls]
    : [glassControls, [...plainControls, 'Todos']];

async function expectMaterialPolicy(
  canvas: ReturnType<typeof within>,
  compact: boolean,
): Promise<void> {
  const [glass, plain] = materialGroups(compact);

  for (const name of glass)
    await waitFor(() =>
      expect(
        canvas.getByRole('button', { name }).closest('[role="group"]'),
      ).toHaveAttribute('aria-label', nativeMaterialLabel),
    );

  for (const name of plain)
    await expect(
      within(canvas.getByRole('button', { name })).queryByRole('group'),
    ).toBeNull();
}
