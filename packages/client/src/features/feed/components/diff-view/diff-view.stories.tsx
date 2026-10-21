import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { DiffView } from './diff-view';
import { inlineDiff, inspectorDiff } from './diff-view-fixtures';

const meta = {
  title: 'Feed/DiffView',
  component: DiffView,
  /*
   * DiffViewProps is declared in diff-view-state.ts, which react-docgen cannot follow
   * (docs/agents/storybook.md, "Docgen"), so the descriptions live here with the prop domain.
   */
  argTypes: {
    file: { control: false },
    inline: {
      control: 'boolean',
      description: 'Draws the hunks alone, as a Feed patch.',
    },
    initialOpen: {
      control: 'boolean',
      description:
        'A file opened from the Stage list reveals its diff even when already viewed.',
    },
    viewed: {
      control: 'boolean',
      description:
        'Inspector only: the file’s Viewed mark, which folds the diff while it is set.',
    },
    onViewedChange: { control: false },
  },
  args: inspectorDiff,
} satisfies Meta<typeof DiffView>;

export default meta;

type Story = StoryObj<typeof meta>;

/*
 * No story for the Viewed fold: without an owner to take onViewedChange the Inspector
 * draws no mark, so the fold belongs to the Change list that owns the marks.
 */

// The Inspector's drawing: a file header and a Viewed fold around the hunks.
export const Inspector: Story = { args: inspectorDiff };

// The Feed's drawing: the hunks alone, as a patch.
export const Inline: Story = { args: inlineDiff };
