import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, isInaccessible, waitFor, within } from 'storybook/test';
import { sharedControls } from './composer-pill-comparison-fixtures';
import comparisonMeta, {
  SharedControls,
} from './composer-pill-comparison.stories';

const meta = {
  ...comparisonMeta,
  title: 'Tests/Composer/ComposerPillComparison',
};

export default meta;

type Story = StoryObj<typeof meta>;

const modelLabel = 'Agent and model';

const names = [
  'Plan',
  'Agents: 2',
  'Shells: 1',
  modelLabel,
  'Mode',
  'Context window',
];

function sharedGeometry(width: number): Story {
  return {
    ...SharedControls,
    beforeEach: () => settleLayout(width),
    play: async ({ canvas }) => {
      for (const name of names)
        await expectControlGeometry(canvas.getByRole('button', { name }));
      await expectMaterialPolicy(canvas);

      if (width === 390) await expectCompactFill(canvas);
      else {
        const usage = canvas.getByRole('button', { name: 'Usage' });
        await expectControlGeometry(usage);
        await expect(hasOwnBackdrop(usage)).toBe(false);
      }

      await expectLabelInset(canvas.getByRole('button', { name: 'Mode' }));
    },
  };
}

async function expectControlGeometry(button: HTMLElement): Promise<void> {
  await expect(button.getBoundingClientRect().height).toBeCloseTo(28, 0);
  await expect(within(button).queryAllByRole('button')).toHaveLength(0);

  for (const text of within(button)
    .queryAllByText(/\S/)
    .filter((element) => !isInaccessible(element)))
    await expectTextGeometry(text);
}

async function expectTextGeometry(element: HTMLElement): Promise<void> {
  const style = getComputedStyle(element);

  await expect(style.fontSize).toBe('14px');
  await expect(style.lineHeight).toBe('20px');
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
    await userEvent.click(canvas.getByRole('button', { name: 'Agents: 2' }));
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

async function expectMaterialPolicy(
  canvas: ReturnType<typeof within>,
): Promise<void> {
  for (const name of ['Plan', 'Agents: 2', 'Shells: 1'])
    await expect(hasOwnBackdrop(canvas.getByRole('button', { name }))).toBe(
      true,
    );

  for (const name of [modelLabel, 'Mode', 'Context window'])
    await expect(hasOwnBackdrop(canvas.getByRole('button', { name }))).toBe(
      false,
    );
}

function hasOwnBackdrop(button: HTMLElement): boolean {
  return [...button.querySelectorAll('*')].some((element) => {
    const { backdropFilter } = getComputedStyle(element);

    return Boolean(backdropFilter && backdropFilter !== 'none');
  });
}

async function expectCompactFill(
  canvas: ReturnType<typeof within>,
): Promise<void> {
  const button = canvas.getByRole('button', { name: 'Mode' });
  const surface = button.firstElementChild;

  if (!surface) throw new Error('The control needs a visible surface.');

  await expect(getComputedStyle(surface).backgroundColor).not.toBe(
    getComputedStyle(button).backgroundColor,
  );
  await expect(getComputedStyle(surface).boxShadow).toBe('none');
}
