import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import { renderCoreMessage } from '../../../../mocks/replaceable-slot';
import { ReplaceableSlotView } from './replaceable-slot';
import {
  coreSlot,
  replacedSlot,
  rewrittenSlot,
} from './replaceable-slot-fixtures';

const meta = {
  title: 'Design System/Patterns/ReplaceableSlot',
  component: ReplaceableSlotView,
  argTypes: {
    input: { control: false },
    state: { control: false },
    renderCore: { control: false },
    onEvent: { control: false },
    onFallback: { control: false },
  },
  args: {
    ...coreSlot,
    renderCore: renderCoreMessage,
    onEvent: action('Plugin event'),
    onFallback: action('fall back to the core drawing'),
  },
} satisfies Meta<typeof ReplaceableSlotView>;

export default meta;

type Story = StoryObj<typeof meta>;

/*
 * A Plugin tree that the App refuses has no story of its own: it falls back to the Core drawing
 * below, which replaceable-slot.test.stories.tsx asserts.
 */

// Nothing has taken the Slot, so Argo draws it.
export const Core: Story = { args: coreSlot };

// A Plugin rewrote the props for the same Slot, which Argo's own component draws.
export const RewrittenProps: Story = { args: rewrittenSlot };

// A Plugin sent its own tree, which stands in for Argo's drawing.
export const Replaced: Story = { args: replacedSlot };
