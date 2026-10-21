import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { ContextControl } from './context-control';
import {
  dumbZoneContext,
  fullContext,
  smartZoneContext,
} from './context-control-fixtures';

const meta = {
  title: 'Composer/ContextControl',
  component: ContextControl,
  args: smartZoneContext,
  argTypes: {
    context: { control: false },
    disabled: { control: 'boolean' },
    // The desktop trigger names the control and its token counts; a phone draws the ring alone.
    wide: { control: 'boolean' },
  },
} satisfies Meta<typeof ContextControl>;

export default meta;

type Story = StoryObj<typeof meta>;

// Focused context: the remaining arc reads in the success tone.
export const SmartZone: Story = { args: smartZoneContext };

// Past the smart zone's edge: the arc takes the warning tone.
export const DumbZone: Story = { args: dumbZoneContext };

// A full window: a zero-length arc would still paint a dot, so none is drawn.
export const Full: Story = { args: fullContext };
