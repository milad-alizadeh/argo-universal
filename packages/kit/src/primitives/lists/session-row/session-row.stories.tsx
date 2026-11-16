import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';
import { kitArgTypes } from '#kit/kit-arg-types';
import {
  SessionRowDrawingContext,
  type SessionRowDrawingProps,
} from '#kit/session-row-drawing';
import { ListItem } from '../list-item';
import { SessionRow } from './session-row';

// Stands in for the App's connected row, which reads the live Session.
function PlaceholderRow(props: SessionRowDrawingProps): React.JSX.Element {
  return (
    <ListItem
      title="Title"
      subtitle={props.sessionId}
      onPress={props.onPress}
    />
  );
}

const meta = {
  title: 'Design System/Primitives/Lists/SessionRow',
  component: SessionRow,
  args: { sessionId: 'session-1', onPress: fn() },
  argTypes: kitArgTypes('SessionRow'),
  decorators: [
    (Story) => (
      <SessionRowDrawingContext value={PlaceholderRow}>
        <Story />
      </SessionRowDrawingContext>
    ),
  ],
} satisfies Meta<typeof SessionRow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
