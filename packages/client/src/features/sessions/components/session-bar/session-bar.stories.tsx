import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { action } from 'storybook/actions';
import { SessionBarStrip } from '#lib/product/session-bar-row';
import { SessionColumn } from '#lib/product/session-column';
import { SessionBar } from './session-bar';
import {
  longLine,
  onePlugin,
  plainLine,
  threePlugins,
} from './session-bar-fixtures';

const meta = {
  title: 'Sessions/SessionBar',
  component: SessionBar,
  // On the bar's strip, as the page draws it.
  decorators: [
    (Story): React.JSX.Element => (
      <SessionBarStrip>
        <SessionColumn>
          <Story />
        </SessionColumn>
      </SessionBarStrip>
    ),
  ],
  argTypes: {
    shown: { control: false },
    hidden: { control: false },
  },
  args: { ...onePlugin, onOpen: action('open the Plugin page') },
} satisfies Meta<typeof SessionBar>;

export default meta;

type Story = StoryObj<typeof meta>;

// One Plugin's line, with Open for its page.
export const OnePlugin: Story = {};

// The first Plugin in Slot order shows; the other two wait behind "+2".
export const ThreePlugins: Story = { args: threePlugins };

// A line with no page has no Open.
export const PlainLine: Story = { args: plainLine };

// A line longer than the column ends with an ellipsis and keeps "+N" in view.
export const LongLine: Story = { args: longLine };
