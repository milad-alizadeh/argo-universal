import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { ChangeStage } from './change-stage';
import {
  branchChange,
  closedChange,
  conflictChange,
  discChange,
  draftChange,
  mergedChange,
  numberedChange,
  openChange,
  workingChange,
} from './change-stage-fixtures';
import { changeModifierNames, changeStageNames } from './change-stage-model';

const meta = {
  title: 'Sessions/ChangeStage',
  component: ChangeStage,
  /*
   * ChangeStageProps is an intersection over ChangeState, which react-docgen cannot
   * expand (docs/agents/storybook.md, "Docgen"), so the descriptions live here.
   */
  argTypes: {
    stage: {
      control: 'select',
      options: changeStageNames,
      description: 'Where the Change has got to.',
    },
    modifier: {
      control: 'select',
      options: changeModifierNames,
      description: 'More about an Open Change, without replacing its stage.',
    },
    form: {
      control: 'select',
      options: ['bare', 'disc'],
      description: 'Whether the glyph sits on a filled disc.',
    },
    number: {
      control: 'number',
      description: "The Change's number, which takes the stage label's place.",
    },
    testID: { control: 'text' },
  },
  args: openChange,
} satisfies Meta<typeof ChangeStage>;

export default meta;

type Story = StoryObj<typeof meta>;

// One story per key in the model's stages map, then one per modifier.

// No branch yet: the Session works in its worktree.
export const Working: Story = { args: workingChange };

// Pushed, with no Change opened for it.
export const Branch: Story = { args: branchChange };

export const Open: Story = { args: openChange };

export const Merged: Story = { args: mergedChange };

export const Closed: Story = { args: closedChange };

// A modifier says more about an Open Change without changing its glyph or tone.
export const Draft: Story = { args: draftChange };

export const Conflict: Story = { args: conflictChange };

// The disc form sets the glyph on a filled disc and widens the gap before the label.
export const Disc: Story = { args: discChange };

// With a number, the label is the Change's number instead of its stage.
export const Numbered: Story = { args: numberedChange };
