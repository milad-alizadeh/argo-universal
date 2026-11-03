import fixtures from '@repo/mocks/plugins/svg.json' with { type: 'json' };
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import { readMotion } from '#mocks/motion-samples';
import { settleLayout } from '#mocks/story-layout';
import { IconButton } from '#primitives/actions/icon-button';
import { Icon } from '#primitives/content/icon';
import { Text } from '#primitives/content/text';
import { Svg } from '#primitives/visual';
import { sampleEachFrame } from '../../../../mocks/sample-each-frame';
import { SettlingContent } from '../collapsible/collapsible-motion-fixtures';
import { Card } from './card';
import { collapsedCard, expandedCard, footerCard } from './card-fixtures';
import type { CardProps } from './card-props';

const mediaXml = fixtures.valid[0]?.xml ?? '';

const title = 'api-gateway';

const toggleName = /^(Collapse|Expand) api-gateway$/;

const expanded = 'aria-expanded';

const removeLabel = 'Remove api-gateway';

const earlierDeploys = '3 earlier deploys';

const deployed = 'Deployed 12 min ago by Ana Ruiz';

const pressed = fn();

const removed = fn();

const meta = {
  title: 'Tests/Design System/Primitives/Layout/Card',
  component: Card,
  args: { title },
} satisfies Meta<typeof Card>;

export default meta;

type Story = StoryObj<typeof Card>;

export const TitleOnly: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('group', { name: title })).toBeVisible();
    await expect(canvas.queryByRole('button')).toBeNull();
  },
};

export const Anatomy: Story = {
  args: {
    subtitle: 'Production',
    icon: <Icon size="md" name="server" />,
    children: <Text>Deployed 12 min ago</Text>,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Production')).toBeVisible();
    await expect(canvas.getByText('Deployed 12 min ago')).toBeVisible();
  },
};

function activation(activate: (button: HTMLElement) => Promise<void>): Story {
  return {
    args: { subtitle: 'Production', onPress: pressed },
    play: async ({ canvas }) => {
      await activate(
        canvas.getByRole('button', { name: 'api-gateway, Production' }),
      );
      await expect(pressed).toHaveBeenCalledOnce();
    },
  };
}

export const PointerActivation = activation(async (button) =>
  userEvent.click(button),
);

function keyboardActivation(key: string): Story {
  return activation(async (button) => {
    button.focus();
    await userEvent.keyboard(key);
  });
}

export const EnterActivation = keyboardActivation('{Enter}');

export const SpaceActivation = keyboardActivation(' ');

export const SpokenName: Story = {
  args: { accessibilityLabel: 'Open api-gateway', onPress: fn() },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('button', { name: 'Open api-gateway' }),
    ).toBeVisible();
  },
};

export const Media: Story = {
  args: {
    media: <Svg xml={mediaXml} label="Service map" />,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('Service map')).toBeVisible();
    await expect(canvas.getByRole('group', { name: title })).toBeVisible();
  },
};

export const ActionPressesAlone: Story = {
  args: {
    onPress: pressed,
    actions: (
      <IconButton
        icon="delete"
        variant="ghost"
        accessibilityLabel="Remove api-gateway"
        onPress={removed}
      />
    ),
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: removeLabel }));
    await expect(removed).toHaveBeenCalledOnce();
    await expect(pressed).not.toHaveBeenCalled();
  },
};

export const ToggleByPointer: Story = {
  args: { ...footerCard, defaultOpen: false },
  play: async ({ canvas }) => {
    const toggle = canvas.getByRole('button', { name: toggleName });

    await expect(toggle).toHaveAttribute(expanded, 'false');
    await expect(canvas.queryByText(earlierDeploys)).toBeNull();
    await userEvent.click(toggle);
    await expect(toggle).toHaveAttribute(expanded, 'true');
    await expect(canvas.getByText(earlierDeploys)).toBeVisible();
    await expect(canvas.getByText(deployed)).toBeVisible();
    await userEvent.click(toggle);
    await waitFor(() => expect(canvas.queryByText(earlierDeploys)).toBeNull());
  },
};

export const ToggleByKeyboard: Story = {
  args: collapsedCard,
  play: async ({ canvas }) => {
    const toggle = canvas.getByRole('button', { name: toggleName });

    toggle.focus();
    await userEvent.keyboard('{Enter}');
    await expect(toggle).toHaveAttribute(expanded, 'true');
    await userEvent.keyboard(' ');
    await expect(toggle).toHaveAttribute(expanded, 'false');
  },
};

export const ReportsOpenChange: Story = {
  args: { ...collapsedCard, onOpenChange: fn() },
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole('button', { name: toggleName }));
    await expect(args.onOpenChange).toHaveBeenCalledWith(true);
  },
};

export const ActionsStayBesideTheTrigger: Story = {
  args: {
    ...collapsedCard,
    actions: (
      <IconButton
        icon="delete"
        variant="ghost"
        accessibilityLabel="Remove api-gateway"
        onPress={removed}
      />
    ),
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: removeLabel }));
    await expect(removed).toHaveBeenCalledOnce();
    await expect(
      canvas.getByRole('button', { name: toggleName }),
    ).toHaveAttribute(expanded, 'false');
  },
};

const nextCard = 'Next card';

// Long enough for the fold and the rest after it.
const foldFrames = 40;

interface FoldSample {
  titleTop: number;
  width: number;
  belowTop: number;
}

function sampleFold(parts: Record<keyof FoldSample, HTMLElement>): FoldSample {
  return {
    titleTop: parts.titleTop.getBoundingClientRect().top,
    width: parts.width.getBoundingClientRect().width,
    belowTop: parts.belowTop.getBoundingClientRect().top,
  };
}

// Presses the title row once and samples every frame after, starting from how things stood before the press.
async function foldOnce(
  parts: Record<keyof FoldSample, HTMLElement>,
): Promise<FoldSample[]> {
  const before = sampleFold(parts);

  const after = await sampleEachFrame(
    () => parts.titleTop.click(),
    () => sampleFold(parts),
    foldFrames,
  );

  return [before, ...after];
}

// The title row holds still, the card keeps its width, and the card below moves one way with no frame that jumps.
async function expectSteadyFold(samples: readonly FoldSample[]): Promise<void> {
  const titleTops = new Set(samples.map((sample) => sample.titleTop));
  const widths = new Set(samples.map((sample) => sample.width));
  await expect(titleTops.size).toBe(1);
  await expect(widths.size).toBe(1);
  const motion = readMotion(samples.map((sample) => sample.belowTop));
  await expect(motion.reversals).toBe(0);
  await expect(motion.overshoot).toBeLessThanOrEqual(1);
  await expect(motion.largestStepShare).toBeLessThan(0.5);
}

// A card whose body grows a frame after it mounts, as a Plugin's tree does, with a card below it.
function foldStory(args: CardProps): Story {
  return {
    args: {
      ...args,
      children: <SettlingContent first={40} last={160} settles="next-frame" />,
    },
    render: (storyArgs) => (
      <View className="gap-4">
        <Card {...storyArgs} />
        <Text>{nextCard}</Text>
      </View>
    ),
    play: async ({ canvas }) => {
      await settleLayout('wide');

      const parts = {
        titleTop: canvas.getByRole('button', { name: toggleName }),
        width: canvas.getByRole('group', { name: title }),
        belowTop: canvas.getByText(nextCard),
      };

      await expectSteadyFold(await foldOnce(parts));
    },
  };
}

// Unfolding, the title row stays put, the card keeps its width, and the card below moves down once with no frame that jumps.
export const UnfoldsWithoutMovingTheTitle = foldStory(collapsedCard);

// Folding, the title row stays put, the card keeps its width, and the card below moves up once with no frame that jumps.
export const FoldsWithoutMovingTheTitle = foldStory(expandedCard);
