import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import {
  type Section,
  sectionOrder,
  sections,
} from '../../../../lib/product/navigation/sections';
import { PhoneDrawerContent } from './phone-drawer-content';

const meta = {
  title: 'Tests/PhoneDrawerContent',
  component: PhoneDrawerContent,
  args: {
    selectedSection: 'sessions',
    attentionCount: 0,
    open: true,
    width: 300,
    onSectionChange: fn(),
  },
} satisfies Meta<typeof PhoneDrawerContent>;

export default meta;

type Story = StoryObj<typeof meta>;

interface AttentionCase {
  count: number;
  label: string;
  text: string | null;
}

// Only the Sessions row carries the badge, capped at 99+.
function attentionBadge({ count, label, text }: AttentionCase): Story {
  return {
    args: { attentionCount: count },
    play: async ({ canvas }) => {
      const badge = canvas.queryByLabelText(label);

      if (text === null) return expect(badge).toBeNull();

      await expect(badge).toHaveTextContent(text);
    },
  };
}

export const NoAttention = attentionBadge({
  count: 0,
  label: '0 Sessions need attention',
  text: null,
});

export const OneAttention = attentionBadge({
  count: 1,
  label: '1 Session needs attention',
  text: '1',
});

export const OverflowAttention = attentionBadge({
  count: 100,
  label: '100 Sessions need attention',
  text: '99+',
});

function selectedRow(section: Section): Story {
  return {
    args: { selectedSection: section },
    play: async ({ canvas }) => {
      for (const other of sectionOrder)
        await expect(
          canvas.getByRole('button', { name: sections[other].title }),
        ).toHaveAttribute('aria-pressed', String(other === section));
    },
  };
}

export const SessionsSelected = selectedRow('sessions');

export const SettingsSelected = selectedRow('settings');

export const PickingARowReportsItsSection: Story = {
  play: async ({ args, canvas, userEvent }) => {
    for (const section of sectionOrder) {
      await userEvent.click(
        canvas.getByRole('button', { name: sections[section].title }),
      );
      await expect(args.onSectionChange).toHaveBeenLastCalledWith(section);
    }
  },
};

export const ClosedIsHiddenFromAssistiveTechnology: Story = {
  args: { open: false },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('heading', { name: 'Argo' })).toBeNull();
  },
};
